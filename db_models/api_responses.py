from sqlalchemy.orm import Session 
from models.model import ApiResponses

def create_api_responses(
    db: Session,
    asset_file_id: int,
    transcript_raw: dict,
    assemblyai_raw: dict,
    gemini_raw: dict,
    transcription_usage: dict,
    llm_usage: dict,
    normalized_transcript: dict,
    sentence_sentiment: dict,
    normalized_insights: dict,
    performance_metrics: dict,
    master_json: dict
  ):

  result = ApiResponses(
        asset_file_id=asset_file_id,
        transcript_raw=transcript_raw,
        assemblyai_raw=assemblyai_raw,
        gemini_raw=gemini_raw,
        transcription_usage=transcription_usage,
        llm_usage=llm_usage,
        normalized_transcript=normalized_transcript,
        sentence_sentiment=sentence_sentiment,
        normalized_insights=normalized_insights,
        performance_metrics=performance_metrics,
        master_json=master_json
    )
  
  db.add(result)
  db.commit()
  db.refresh(result)
  return result

def get_processing_result_by_asset(db: Session, asset_file_id: int):
    return db.query(ApiResponses).filter(ApiResponses.asset_file_id == asset_file_id).first()