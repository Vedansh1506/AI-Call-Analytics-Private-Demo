import ast
import json
import re
from pathlib import Path

import google.generativeai as genai

from utils.config import settings
from utils.logger import get_logger

logger = get_logger(__name__)
genai.configure(api_key=settings.GEMINI_API_KEY)

PROMPT_BASE = Path("prompts/gemini")

def load_prompt(prompt_type: str, lang: str = "en") -> str:
    prompt_path = PROMPT_BASE / prompt_type / f"{lang}.txt"
    return prompt_path.read_text(encoding="utf-8")

def load_schema(lang: str = "en") -> dict:
    schema_path = PROMPT_BASE / "schema" / f"{lang}.json"
    return json.loads(schema_path.read_text(encoding="utf-8"))

def extract_json(text: str) -> dict:
    """
    Robust JSON extraction from Gemini output.
    Handles:
    - explanations before/after JSON
    - unquoted keys
    - trailing commas
    """

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise RuntimeError("No JSON object found in Gemini response")

    raw = match.group().strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    try:
        return ast.literal_eval(raw)
    except Exception as e:
        raise RuntimeError(
            f"Gemini returned non-parseable JSON.\n"
            f"Raw output:\n{raw}\n\nError: {e}"
        )


def normalize_analysis_shape(payload: dict) -> dict:
    """
    Defensive normalization for slight schema drift from LLM responses.
    Keeps canonical keys expected by backend/frontend.
    """
    if not isinstance(payload, dict):
        return payload

    call_details = payload.get("CallDetails")
    if isinstance(call_details, dict):
        # Some responses may emit "Sentiment" instead of "OverallSentiment".
        if "OverallSentiment" not in call_details and "Sentiment" in call_details:
            call_details["OverallSentiment"] = call_details.get("Sentiment")
        call_details.pop("Sentiment", None)

        def canonical_sentiment(value: object) -> str:
            v = str(value or "").strip().lower()
            if v == "positive":
                return "Positive"
            if v == "negative":
                return "Negative"
            if v == "neutral":
                return "Neutral"
            return "Unknown"

        def canonical_resolution(value: object) -> str:
            v = str(value or "").strip().lower()
            if v == "resolved":
                return "Resolved"
            if v == "unresolved":
                return "Unresolved"
            if v == "pending":
                return "Pending"
            if v in {"not applicable", "not-applicable", "non applicable", "n/a", "na"}:
                return "Not Applicable"
            return "Unknown"

        def canonical_churn(value: object) -> str:
            v = str(value or "").strip().lower()
            if v == "high":
                return "High"
            if v == "medium":
                return "Medium"
            if v == "low":
                return "Low"
            if v in {"not applicable", "not-applicable", "non applicable", "n/a", "na"}:
                return "Not Applicable"
            return "Unknown"

        call_details["OverallSentiment"] = canonical_sentiment(call_details.get("OverallSentiment"))

        resolution = call_details.get("ResolutionData")
        if isinstance(resolution, dict):
            resolution["Status"] = canonical_resolution(resolution.get("Status"))
            call_details["ResolutionData"] = resolution

        churn = call_details.get("ChurnRisk")
        if isinstance(churn, dict):
            churn["Level"] = canonical_churn(churn.get("Level"))
            call_details["ChurnRisk"] = churn

        payload["CallDetails"] = call_details

    return payload

def gemini_analysis(
    transcript_text: str,
    utterances: list,
    lang: str = "en",
) -> dict:
    system_prompt = load_prompt("system", lang)

    user_prompt = (
        load_prompt("user", lang)
        .replace("$call_log", transcript_text)
        .replace(
            "$utterances_json",
            json.dumps(
                [
                    {
                        "utterance_id": idx,
                        "speaker": u["speaker"],
                        "text": u["text"]
                    }
                    for idx, u in enumerate(utterances)
                ],
                ensure_ascii=False
            )
        )
    )

    user_prompt = f"Return ALL analysis fields strictly in English.\n\n{user_prompt}"

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt
    )

    response = model.generate_content(
        user_prompt,
        generation_config={
            "temperature": 0.2,
            "response_mime_type": "application/json"
        }
    )

    if not response or not response.text:
        raise RuntimeError("Gemini returned empty response")

    result_json = normalize_analysis_shape(extract_json(response.text))

    llm_usage = {}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        llm_usage = {
            "provider": "gemini",
            "model": "gemini-2.5-flash",
            "prompt_tokens": response.usage_metadata.prompt_token_count,
            "candidate_tokens": response.usage_metadata.candidates_token_count,
            "total_tokens": response.usage_metadata.total_token_count
        }

    return {
        "analysis": result_json,
        "llm_usage": llm_usage
    }

def translate_utterances_to_english(utterances: list[dict]) -> list[dict]:
    if not utterances:
        return []

    model = genai.GenerativeModel(model_name="gemini-2.5-flash")
    payload = [
        {
            "idx": i,
            "speaker": u.get("speaker"),
            "start": u.get("start"),
            "end": u.get("end"),
            "text": u.get("text", "")
        }
        for i, u in enumerate(utterances)
    ]

    prompt = (
        "Translate each item's text to English. "
        "Keep speaker/start/end unchanged. "
        "Return strict JSON object with this exact shape: "
        "{\"items\":[{\"idx\":0,\"speaker\":\"...\",\"start\":0,\"end\":0,\"text\":\"...\"}]}\n\n"
        f"{json.dumps(payload, ensure_ascii=False)}"
    )

    response = model.generate_content(
        prompt,
        generation_config={"temperature": 0, "response_mime_type": "application/json"},
    )

    translated = extract_json(response.text)
    if not isinstance(translated, dict) or "items" not in translated:
        raise RuntimeError("Translation response missing 'items'")
    translated = translated["items"]

    out = []
    for item in translated:
        out.append(
            {
                "speaker": item.get("speaker"),
                "start": item.get("start"),
                "end": item.get("end"),
                "text": item.get("text", ""),
            }
        )
    return out

def translate_analysis_insights(base_insights: dict, target_language_code: str) -> dict:
    if not base_insights:
        return {}

    model = genai.GenerativeModel(model_name="gemini-2.5-flash")
    prompt = (
        f"Translate user-facing text values in this JSON to language code '{target_language_code}'. "
        "Keep JSON keys and structure exactly unchanged. "
        "Do not remove or add fields. "
        "Enum fields MUST stay in English only. "
        "Use these exact values only: "
        "OverallSentiment -> Positive | Neutral | Negative | Unknown ; "
        "ResolutionData.Status -> Resolved | Unresolved | Pending | Not Applicable | Unknown ; "
        "ChurnRisk.Level -> High | Medium | Low | Not Applicable | Unknown. "
        "Return strict JSON object only.\n\n"
        f"{json.dumps(base_insights, ensure_ascii=False)}"
    )

    response = model.generate_content(
        prompt,
        generation_config={"temperature": 0, "response_mime_type": "application/json"},
    )
    return normalize_analysis_shape(extract_json(response.text))
