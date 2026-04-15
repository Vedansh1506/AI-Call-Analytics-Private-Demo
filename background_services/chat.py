import os
from pathlib import Path

import google.generativeai as genai

genai.configure(api_key=os.environ["GEMINI_API_KEY"])

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "gemini" / "chat" / "en.txt"


def _load_system_prompt() -> str:
    return PROMPT_PATH.read_text(encoding="utf-8")


def _build_transcript_text(normalized_transcript: dict | None) -> str:
    """Flatten transcript utterances into readable text."""
    if not normalized_transcript:
        return "Transcript not available."

    # your structure: top-level 'utterances' array is the canonical one
    utterances = normalized_transcript.get("utterances", [])

    # fallback: try variants.original.utterances
    if not utterances:
        variants = normalized_transcript.get("variants", {})
        original = variants.get("original", {})
        utterances = original.get("utterances", [])

    if not utterances:
        return "Transcript not available."

    lines = []
    for u in utterances:
        speaker_id = u.get("speaker_id", "")
        role = u.get("role", "")
        text = u.get("text", "")

        # build a clean label: "Richard (Podcast Co-host_1)" or just role
        if role:
            label = role
        elif speaker_id:
            num = speaker_id.split("_")[-1]
            label = f"Speaker {int(num) + 1}" if num.isdigit() else speaker_id
        else:
            label = "Speaker"

        lines.append(f"{label}: {text}")

    return "\n".join(lines)


def _build_analysis_summary(normalized_insights: dict | None) -> str:
    """Flatten key insights into readable text for context."""
    if not normalized_insights:
        return "Analysis not available."

    parts = []

    # your actual key names — all PascalCase
    call_type = normalized_insights.get("CallType", "")
    if call_type:
        parts.append(f"Call type: {call_type}")

    summary = normalized_insights.get("CallSummary", "")
    if summary:
        parts.append(f"Summary: {summary}")

    sentiment = normalized_insights.get("OverallSentiment", "")
    if sentiment:
        parts.append(f"Overall sentiment: {sentiment}")

    churn = normalized_insights.get("ChurnRisk", {})
    if churn and isinstance(churn, dict):
        level = churn.get("Level", "")
        reason = churn.get("Reason", "")
        if level and level.lower() not in ("not applicable", "n/a"):
            parts.append(f"Churn risk: {level} — {reason}")

    resolution = normalized_insights.get("ResolutionData", {})
    if resolution and isinstance(resolution, dict):
        status = resolution.get("Status", "")
        reason = resolution.get("Reason", "")
        if status:
            parts.append(f"Resolution: {status} — {reason}")

    strengths = normalized_insights.get("KeyStrengths", [])
    if strengths:
        parts.append("Key strengths: " + "; ".join(strengths[:3]))

    improvements = normalized_insights.get("AreasOfImprovement", [])
    if improvements:
        parts.append("Areas for improvement: " + "; ".join(improvements[:3]))

    topics = normalized_insights.get("Topics", [])
    if topics:
        topic_names = [t.get("topic", "") for t in topics if t.get("topic")]
        if topic_names:
            parts.append("Topics discussed: " + ", ".join(topic_names[:5]))

    keywords = normalized_insights.get("KeywordCounts", {})
    if keywords:
        top_kw = sorted(keywords.items(), key=lambda x: x[1], reverse=True)[:10]
        parts.append("Top keywords: " + ", ".join(k for k, _ in top_kw))

    participants = normalized_insights.get("Participants", [])
    if participants:
        p_list = []
        for p in participants:
            name = p.get("name", "Unknown")
            role = p.get("role", "")
            p_list.append(f"{name} ({role})" if role else name)
        parts.append("Participants: " + ", ".join(p_list))

    return "\n".join(parts)


def ask_call(
    asset_id: int,
    file_name: str,
    language: str,
    call_length: float | None,
    normalized_insights: dict | None,
    normalized_transcript: dict | None,
    conversation_history: list[dict],
    user_message: str,
) -> str:
    """
    Run a single conversational turn against a specific call's data.

    conversation_history: list of {"role": "user"|"model", "parts": [{"text": "..."}]}
    Returns the assistant's reply as a plain string.
    """
    system_prompt_template = _load_system_prompt()

    duration_minutes = (
        round(call_length / 60, 1) if call_length else "unknown"
    )
    sentiment = (
        normalized_insights.get("OverallSentiment", "unknown")
        if normalized_insights
        else "unknown"
    )

    analysis_summary = _build_analysis_summary(normalized_insights)
    transcript_text = _build_transcript_text(normalized_transcript)

    system_prompt = system_prompt_template.format(
        file_name=file_name,
        language=language or "unknown",
        duration_minutes=duration_minutes,
        sentiment=sentiment,
        analysis_summary=analysis_summary,
        transcript=transcript_text,
    )

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_prompt,
    )

# history is already plain dicts from the router
    history = [
        {"role": h["role"], "parts": [{"text": h["parts"][0]["text"]}]}
        for h in conversation_history
        if h.get("parts") and h["parts"][0].get("text")
    ]
    
    chat = model.start_chat(history=history)
    response = chat.send_message(user_message)
    return response.text