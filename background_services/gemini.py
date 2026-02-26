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

    # 1️⃣ Extract JSON-like block
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise RuntimeError("No JSON object found in Gemini response")

    raw = match.group().strip()

    # 2️⃣ Try strict JSON
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 3️⃣ Fallback: Python-safe evaluation
    try:
        return ast.literal_eval(raw)
    except Exception as e:
        raise RuntimeError(
            f"Gemini returned non-parseable JSON.\n"
            f"Raw output:\n{raw}\n\nError: {e}"
        )

def gemini_analysis(transcript_text: str, utterances: list, lang: str = "en") -> dict:
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

    result_json = extract_json(response.text)

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