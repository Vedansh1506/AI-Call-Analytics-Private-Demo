from collections import defaultdict


def convert(milliseconds: int) -> str:
    seconds = milliseconds // 1000
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"

def calc_performance(utterances, audio_start_ms, audio_end_ms):
    """
    Role-agnostic performance metrics.
    Works for Agent/Client, Interviewer/Candidate, etc.
    """

    talk_time_by_role = defaultdict(int)

    for u in utterances:
        duration = u["end"] - u["start"]
        role = u.get("role", "Unknown")
        talk_time_by_role[role] += duration

    total_call_duration = audio_end_ms - audio_start_ms
    total_talk_time = sum(talk_time_by_role.values())
    silence_time = max(total_call_duration - total_talk_time, 0)

    if not utterances:
        return {
            "TotalCallDuration": convert(total_call_duration),
            "TalkTimeByRole": {},
            "SilenceTime": convert(total_call_duration),
            "RawTalkTimeMs": {}
    }
    
    talk_listen_ratio = {}
    roles = list(talk_time_by_role.keys())

    for role in roles:
        role_talk = talk_time_by_role[role]
        others_talk = total_talk_time - role_talk

        if others_talk > 0:
            ratio = round(role_talk / others_talk, 2)
        else:
            ratio = None

        talk_listen_ratio[role] = ratio

    # Convert to readable format
    talk_time_readable = {
        role: convert(ms)
        for role, ms in talk_time_by_role.items()
    }

    return {
        "TotalCallDuration": convert(total_call_duration),
        "TalkTimeByRole": talk_time_readable,
        "TalkListenRatio": talk_listen_ratio,
        "SilenceTime": convert(silence_time),
        "RawTalkTimeMs": dict(talk_time_by_role)
    }

