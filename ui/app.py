"""
AI Call Insights - Streamlit Application
Shows ONLY data that backend actually provides
"""

import streamlit as st
import requests
import mimetypes
from datetime import datetime
import time
import os
import matplotlib.pyplot as plt
# ==================== CONFIGURATION ====================

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

ENDPOINTS = {
    "login": f"{API_BASE_URL}/auth/login",
    "register": f"{API_BASE_URL}/auth/register",
    "upload_asset": f"{API_BASE_URL}/assets/upload",
    "list_assets": f"{API_BASE_URL}/assets",
    "get_analysis": f"{API_BASE_URL}/assets/{{asset_id}}/analysis",
    "supported_languages": f"{API_BASE_URL}/assets/supported-languages",
    "stats": f"{API_BASE_URL}/assets/stats",
}

POLLING_INTERVAL = 5
MAX_FILE_SIZE_MB = 100

st.set_page_config(
    page_title="AI Call Insights",
    page_icon="🎙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==================== SESSION STATE ====================

if "token" not in st.session_state:
    st.session_state.token = None
if "current_page" not in st.session_state:
    st.session_state.current_page = "login"
if "selected_asset_id" not in st.session_state:
    st.session_state.selected_asset_id = None

# ==================== API FUNCTIONS ====================

def api_register(first_name, last_name, email, mobile_no, password):
    response = requests.post(ENDPOINTS["register"], json={
        "first_name": first_name, "last_name": last_name,
        "email": email, "mobile_no": mobile_no, "password": password
    })
    response.raise_for_status()
    return response.json()

def api_login(email, password):
    response = requests.post(ENDPOINTS["login"], data={"username": email, "password": password})
    response.raise_for_status()
    return response.json()

def api_upload_audio(file_content, filename, token, language=None):
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = 'audio/mpeg' if filename.lower().endswith('.mp3') else 'audio/wav'
    
    files = {"file": (filename, file_content, mime_type)}
    headers = {"Authorization": f"Bearer {token}"}
    params = {"language": language} if language else {}
    
    response = requests.post(ENDPOINTS["upload_asset"], files=files, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def api_list_assets(token, params=None):
    response = requests.get(
        ENDPOINTS["list_assets"],
        headers={"Authorization": f"Bearer {token}"},
        params=params
    )

    response.raise_for_status()
    return response.json()

def api_get_analysis(asset_id, token):
    url = ENDPOINTS["get_analysis"].format(asset_id=asset_id)
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    response.raise_for_status()
    return response.json()

def api_get_languages():
    response = requests.get(ENDPOINTS["supported_languages"])
    response.raise_for_status()
    return response.json()

def api_get_stats(token):
    response = requests.get(
        ENDPOINTS["stats"],
        headers={"Authorization": f"Bearer {token}"}
    )
    response.raise_for_status()
    return response.json()

# ==================== HELPER FUNCTIONS ====================

def format_duration(seconds):
    try:
        if isinstance(seconds, str):
            if ':' in seconds: return seconds
            seconds = float(seconds)
        seconds = int(float(seconds))
        h, m, s = seconds // 3600, (seconds % 3600) // 60, seconds % 60
        return f"{h:02d}:{m:02d}:{s:02d}"
    except:
        return str(seconds)

def get_status_badge(status):
    badges = {"uploaded": "🟡", "processing": "🔵", "completed": "🟢", "failed": "🔴", "error": "🔴"}
    return f"{badges.get(status, '⚪')} {status.capitalize()}"

def format_datetime(dt_string):
    try:
        dt = datetime.fromisoformat(dt_string.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return dt_string

# ==================== PAGES ====================

def page_login():
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.title("🎙️ AI Call Insights")
        tab1, tab2 = st.tabs(["Login", "Register"])
        
        with tab1:
            st.subheader("Login")
            with st.form("login"):
                email = st.text_input("Email")
                password = st.text_input("Password", type="password")
                if st.form_submit_button("Login", type="primary", use_container_width=True):
                    try:
                        result = api_login(email, password)
                        if result.get("success"):
                            st.session_state.token = result["access_token"]
                            st.session_state.current_page = "assets"
                            st.rerun()
                    except requests.exceptions.HTTPError as e:
                        st.error("Invalid credentials" if e.response.status_code == 401 else f"Error: {e.response.status_code}")
        
        with tab2:
            st.subheader("Register")
            with st.form("register"):
                fn = st.text_input("First Name")
                ln = st.text_input("Last Name")
                em = st.text_input("Email", key="reg_email")
                mb = st.text_input("Mobile")
                pw = st.text_input("Password", type="password", key="reg_pw")
                pc = st.text_input("Confirm Password", type="password")
                if st.form_submit_button("Register", type="primary", use_container_width=True):
                    if pw != pc:
                        st.error("Passwords don't match")
                    else:
                        try:
                            if api_register(fn, ln, em, mb, pw).get("success"):
                                st.success("Account created! Please login.")
                                time.sleep(2)
                                st.rerun()
                        except requests.exceptions.HTTPError as e:
                            st.error("Email exists" if e.response.status_code == 400 else f"Error: {e.response.status_code}")

def page_upload():
    st.title("📤 Upload Audio")
    file = st.file_uploader("Choose audio file", type=["mp3", "wav"])
    
    try:
        langs_data = api_get_languages()
        if isinstance(langs_data.get("supported_languages"), dict):
            languages = ["Auto-detect"] + list(langs_data["supported_languages"].keys())
        else:
            languages = ["Auto-detect"] + langs_data.get("supported_languages", [])
    except:
        languages = ["Auto-detect"]
    
    lang = st.selectbox("Language", languages)
    
    if file:
        size_mb = file.size / (1024 * 1024)
        st.info(f"📁 {file.name} ({size_mb:.2f} MB)")
        
        if size_mb > MAX_FILE_SIZE_MB:
            st.error(f"File too large! Max: {MAX_FILE_SIZE_MB}MB")
        elif st.button("Upload & Process", type="primary"):
            try:
                result = api_upload_audio(file.read(), file.name, st.session_state.token, None if lang == "Auto-detect" else lang)
                if result.get("success"):
                    st.success(f"✅ Uploaded! ID: {result.get('asset_file_id')}")
                    time.sleep(1)
                    st.session_state.current_page = "assets"
                    st.rerun()
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 401:
                    st.session_state.token = None
                    st.rerun()
                st.error(f"Upload failed: {e.response.status_code}")

def page_assets():
    st.title("📊 My Assets")
    auto_refresh = st.checkbox("Auto-refresh", value=True)
    # ---- DASHBOARD STATS ----
    try:
        stats = api_get_stats(st.session_state.token)

        c1, c2, c3, c4 = st.columns(4)

        c1.metric("Total Calls", stats.get("total_calls", 0))
        c2.metric("Completed", stats.get("completed_calls", 0))
        c3.metric("Failed", stats.get("failed_calls", 0))
        c4.metric("Avg Duration (sec)", stats.get("average_call_duration_sec", 0))

        st.divider()

    except Exception:
        st.warning("Could not load dashboard stats")

    
    st.subheader("Filters")

    col1, col2, col3, col4 = st.columns(4)

    status_filter = col1.selectbox(
        "Status",
        ["All", "uploaded", "processing", "completed", "failed"]
    )

    language_filter = col2.text_input("Language (optional)")

    sentiment_filter = col3.selectbox(
        "Sentiment",
        ["All", "Positive", "Neutral", "Negative"]
    )

    search_text = col4.text_input("Search filename or transcript")

    page = st.number_input("Page", min_value=1, value=1)

    try:
        params = {
            "page": page,
            "page_size": 10
        }

        if status_filter != "All":
            params["status_filter"] = status_filter

        if language_filter:
            params["language"] = language_filter

        if sentiment_filter != "All":
            params["sentiment"] = sentiment_filter

        if search_text:
            params["search"] = search_text

        response = api_list_assets(st.session_state.token, params)
        assets = response.get("items", [])

        if not assets:
            st.info("No assets. Upload an audio file!")
            return
        
        # Metrics
        c1, c2, c3, c4 = st.columns(4)
        total_count = response.get("total", len(assets))

        c1.metric("Total", total_count)
        c2.metric("Completed", sum(1 for a in assets if a.get("status") == "completed"))
        c3.metric("Processing", sum(1 for a in assets if a.get("status") in ["processing", "uploaded"]))
        c4.metric("Failed", sum(1 for a in assets if a.get("status") in ["failed", "error"]))
        st.caption(f"Showing {len(assets)} of {total_count} assets")

        st.divider()

        sentiment_data = stats.get("sentiment_distribution", {})

        if sentiment_data:
            st.subheader("Sentiment Distribution")
            st.bar_chart(sentiment_data)

        recent_calls = stats.get("recent_calls", [])

        if recent_calls:
            st.subheader("Recent Calls")

            for call in recent_calls:
                col1, col2, col3, col4 = st.columns([1,4,2,1])

                col1.write(call["asset_id"])
                col2.write(call["filename"])
                col3.write(call["status"])
                
                if col4.button("Open", key=f"recent_{call['asset_id']}"):
                    st.session_state.selected_asset_id = call["asset_id"]
                    st.session_state.current_page = "analysis"
                    st.rerun()


        # Simple table with ONLY backend data
        cols = st.columns([0.7, 2.5, 1.2, 1, 1.2, 1.5, 1])
        cols[0].markdown("**ID**")
        cols[1].markdown("**Filename**")
        cols[2].markdown("**Status**")
        cols[3].markdown("**Language**")
        cols[4].markdown("**Duration**")
        cols[5].markdown("**Created**")
        cols[6].markdown("**Action**")
        
        st.divider()
        
        for asset in assets:
            cols = st.columns([0.7, 2.5, 1.2, 1, 1.2, 1.5, 1])
            cols[0].write(asset.get("asset_id"))
            cols[1].write(asset.get("filename", "Unknown"))
            cols[2].write(get_status_badge(asset.get("status", "unknown")))
            cols[3].write(asset.get("language", "unknown").upper())
            
            dur = asset.get("call_length", "unknown")
            cols[4].write(format_duration(dur) if dur != "unknown" else dur)
            cols[5].write(format_datetime(asset.get("created_date_time", "")))
            if asset.get("status") == "failed":
                st.caption(
                    f"Stage: {asset.get('processing_stage','unknown')} | "
                    f"Reason: {asset.get('error_reason','Unknown')}"
                )
            
            status = asset.get("status")
            with cols[6]:
                if status == "completed":
                    if st.button("View", key=f"v_{asset.get('asset_id')}", type="primary", use_container_width=True):
                        st.session_state.selected_asset_id = asset.get("asset_id")
                        st.session_state.current_page = "analysis"
                        st.rerun()
                elif status in ["processing", "uploaded"]:
                    st.button("⏳", key=f"p_{asset.get('asset_id')}", disabled=True, use_container_width=True)
                else:
                    st.button("❌", key=f"f_{asset.get('asset_id')}", disabled=True, use_container_width=True)
            st.divider()
        
        if auto_refresh and any(a.get("status") in ["processing", "uploaded"] for a in assets):
            st.info(f"Refreshing in {POLLING_INTERVAL}s...")
            time.sleep(POLLING_INTERVAL)
            st.rerun()
    
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            st.session_state.token = None
            st.rerun()
        st.error(f"Error: {e.response.status_code}")

def page_dashboard():
    st.title("📊 Dashboard")

    try:
        stats = api_get_stats(st.session_state.token)

        c1, c2, c3, c4 = st.columns(4)

        c1.metric("Total Calls", stats.get("total_calls", 0))
        c2.metric("Completed", stats.get("completed_calls", 0))
        c3.metric("Failed", stats.get("failed_calls", 0))
        c4.metric("Avg Duration (sec)", stats.get("average_call_duration_sec", 0))

        st.divider()

        # Sentiment chart
        sentiment_data = stats.get("sentiment_distribution", {})
        if sentiment_data:
            st.subheader("Sentiment Distribution")

            labels = list(sentiment_data.keys())
            values = list(sentiment_data.values())

            import matplotlib.pyplot as plt
            fig, ax = plt.subplots()
            ax.pie(values, labels=labels, autopct="%1.0f%%")
            st.pyplot(fig)

        st.divider()

        # Recent calls
        recent_calls = stats.get("recent_calls", [])
        if recent_calls:
            st.subheader("Recent Calls")

            for call in recent_calls:
                st.markdown(
                    f"**{call['filename']}**  \n"
                    f"Status: {call['status']} | "
                    f"Duration: {format_duration(call['call_length'])}"
                )
                st.divider()

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            st.session_state.token = None
            st.rerun()
        st.error(f"Error loading dashboard: {e.response.status_code}")


def page_analysis():
    if not st.session_state.selected_asset_id:
        st.session_state.current_page = "assets"
        st.rerun()
        return
    
    if st.button("← Back"):
        st.session_state.current_page = "assets"
        st.rerun()
    
    st.title(f"📈 Analysis - Asset #{st.session_state.selected_asset_id}")
    
    try:
        with st.spinner("Loading analysis..."):
            data = api_get_analysis(st.session_state.selected_asset_id, st.session_state.token)
        
        st.write(f"**File:** {data.get('filename', 'Unknown')}")
        st.divider()
        
        # Get the actual data structure
        call_details = data.get("normalized_insights", {})
        transcript = data.get("normalized_transcript", {})
        sentence_sentiment = data.get("sentence_sentiment", [])
        
        # Create tabs for different views
        tab1, tab2, tab3, tab4, tab5 = st.tabs([
            "📝 Summary", "👥 Participants", "💬 Transcript", 
            "💡 Insights", "⚡ Performance"
        ])
        
        # TAB 1: SUMMARY
        with tab1:
            st.subheader("Call Summary")
            
            c1, c2, c3 = st.columns(3)
            c1.metric("Language", data.get("language", "Unknown").upper())
            c2.metric("Duration", format_duration(data.get("call_length", 0)))
            c3.metric("Sentiment", call_details.get("Sentiment", "N/A"))
            
            st.divider()
            
            summary = call_details.get("Summary", "")
            if summary:
                st.markdown("### Summary")
                st.write(summary)
        
        # TAB 2: PARTICIPANTS
        with tab2:
            st.subheader("Participants")
            participants = call_details.get("Participants", [])
            
            if participants:
                for p in participants:
                    st.markdown(f"### 👤 {p.get('Name', 'Unknown')}")
                    st.markdown(f"**Role:** {p.get('Role', 'N/A')}")
                    st.markdown(f"**Speaking Time:** {p.get('SpeakingTime', 'N/A')}")
                    st.markdown(f"**Sentiment:** {p.get('Sentiment', 'N/A')}")
                    st.divider()
            else:
                st.info("No participant data")
        
        # TAB 3: TRANSCRIPT
        with tab3:
            st.subheader("Transcript")
            utterances = transcript.get("utterances", [])
            
            if utterances:
                for utt in utterances:
                    spk = utt.get("speaker", "Unknown")
                    role = utt.get("role", "")
                    name = role if spk == "Unknown" and role else spk
                    
                    start = utt.get("start", 0)
                    mins, secs = int(start // 60), int(start % 60)
                    
                    st.markdown(f"**{name}** `{mins:02d}:{secs:02d}`")
                    st.write(utt.get("text", ""))
                    st.divider()
            else:
                st.info("No transcript")
        
        # TAB 4: INSIGHTS
        with tab4:
            st.subheader("Insights")
            
            # Topics
            if "Topics" in call_details:
                st.markdown("### Topics")
                for topic in call_details["Topics"]:
                    with st.expander(f"**{topic.get('Topic', 'N/A')}**"):
                        st.write(topic.get('Description', 'N/A'))
                st.divider()
            
            # Technical Terms
            if "TechnicalTerms" in call_details:
                st.markdown("### Technical Terms")
                for term in call_details["TechnicalTerms"]:
                    st.markdown(f"**{term.get('Term', 'N/A')}:** {term.get('Definition', 'N/A')}")
                st.divider()
            
            # Extracted Information
            if "ExtractedInformation" in call_details:
                st.markdown("### Extracted Information")
                extracted = call_details["ExtractedInformation"]
                
                for key, value in extracted.items():
                    with st.expander(f"**{key}**"):
                        if isinstance(value, list):
                            for item in value:
                                if isinstance(item, dict):
                                    for k, v in item.items():
                                        st.markdown(f"• **{k}:** {v}")
                                else:
                                    st.markdown(f"• {item}")
                        else:
                            st.write(value)
                st.divider()
            
            # Keyword Counts
            if "KeywordCounts" in call_details:
                st.markdown("### Keyword Counts")
                for kw, count in call_details["KeywordCounts"].items():
                    st.markdown(f"• **{kw}:** {count}")
            
            # Sentence Sentiment
            if sentence_sentiment:
                st.markdown("### Sentiment Timeline")
                for idx, item in enumerate(sentence_sentiment, 1):
                    sent = item.get("sentiment", "")
                    badge = "🟢" if sent.upper() == "POSITIVE" else ("🔴" if sent.upper() == "NEGATIVE" else "🟡")
                    
                    st.markdown(f"**{idx}. {badge} {sent}**")
                    st.write(item.get("text", ""))
                    st.divider()
        
        # TAB 5: PERFORMANCE
        with tab5:
            st.subheader("Performance Metrics")
            
            perf = data.get("performance_metrics", {})
            llm = data.get("llm_usage", {})
            trans_usage = data.get("transcription_usage", {})
            
            if perf:
                st.markdown("### Processing Metrics")
                for k, v in perf.items():
                    st.markdown(f"**{k.replace('_', ' ').title()}:** {v}")
                st.divider()
            
            if llm:
                st.markdown("### LLM Usage")
                for k, v in llm.items():
                    st.markdown(f"**{k.replace('_', ' ').title()}:** {v}")
                st.divider()
            
            if trans_usage:
                st.markdown("### Transcription Usage")
                for k, v in trans_usage.items():
                    st.markdown(f"**{k.replace('_', ' ').title()}:** {v}")
    
    except requests.exceptions.HTTPError as e:
        st.error(f"❌ HTTP Error: {e.response.status_code}")
        st.write("**Error Details:**")
        try:
            error_data = e.response.json()
            st.json(error_data)
        except:
            st.code(e.response.text)
        
        if e.response.status_code == 401:
            st.session_state.token = None
            st.rerun()
        elif e.response.status_code == 409:
            st.warning("Still processing...")
            if st.button("Refresh"):
                st.rerun()
    except Exception as e:
        st.error(f"❌ Unexpected Error: {str(e)}")
        st.write("**Error Type:**", type(e).__name__)
        import traceback
        st.code(traceback.format_exc())

# ==================== MAIN ====================

def main():
    if not st.session_state.token:
        page_login()
        return
    
    with st.sidebar:
        st.title("🎙️ AI Call Insights")
        st.divider()
        
        if st.button("📊 Dashboard", use_container_width=True,
                type="primary" if st.session_state.current_page == "dashboard" else "secondary"):
            st.session_state.current_page = "dashboard"
            st.rerun()

        if st.button("📤 Upload", use_container_width=True, 
                     type="primary" if st.session_state.current_page == "upload" else "secondary"):
            st.session_state.current_page = "upload"
            st.rerun()
        
        if st.button("📊 Assets", use_container_width=True,
                     type="primary" if st.session_state.current_page == "assets" else "secondary"):
            st.session_state.current_page = "assets"
            st.rerun()
        
        st.divider()
        
        if st.button("🚪 Logout", use_container_width=True):
            st.session_state.token = None
            st.session_state.current_page = "login"
            st.rerun()
    
    if st.session_state.current_page == "dashboard":
        page_dashboard()
    elif st.session_state.current_page == "upload":
        page_upload()
    elif st.session_state.current_page == "assets":
        page_assets()
    elif st.session_state.current_page == "analysis":
        page_analysis()


if __name__ == "__main__":
    main()