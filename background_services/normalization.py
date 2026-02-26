from collections import defaultdict


def normalize_speakers(utterances, participants):
    """
    Inject Gemini-inferred roles into AssemblyAI utterances.
    """

    # Build speaker_id -> role map from Gemini
    speaker_role_map = {}

    for p in participants:
        speaker_id = p.get("speaker_id")
        role = p.get("role", "Unknown")

        if speaker_id:
            speaker_role_map[speaker_id] = role
    
    role_to_speakers = defaultdict(list)
    for speaker_id, role in speaker_role_map.items():
        role_to_speakers[role].append(speaker_id)
    
    resolved_roles = {}

    for role, speakers in role_to_speakers.items():
        if len(speakers) == 1:
            resolved_roles[speakers[0]] = role
        else:
            for idx, speaker_id in enumerate(speakers, start=1):
                resolved_roles[speaker_id] = f"{role}_{idx}"
    
    normalized = []

    for u in utterances:
        speaker_id = u["speaker"]

        normalized.append({
            "speaker_id": speaker_id,
            "start": u["start"],
            "end": u["end"],
            "text": u["text"],
            "role": resolved_roles.get(speaker_id, "Unknown")
        })

    return normalized
