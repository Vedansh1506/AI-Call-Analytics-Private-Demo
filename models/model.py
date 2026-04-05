from datetime import datetime, timezone

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, text, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB

from utils.database import Base


class AuthUser(Base):
  __tablename__ = 'auth_user'

  chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
  file_asset = relationship("AssetFile", back_populates="user",cascade="all, delete-orphan",passive_deletes=True)

  id = Column(Integer, primary_key=True, index=True)
  first_name=Column(String, nullable=False)
  last_name=Column(String, nullable=False)
  mobile_no=Column(String, nullable=False)
  email=Column(String, unique=True, index=True, nullable=False)
  password=Column(String, nullable=False)
  is_verified = Column(String, nullable=False, default="false")
  google_id    = Column(String, nullable=True, unique=True)
  auth_provider = Column(String, nullable=False, default="email")

class AssetFile(Base):
  __tablename__ = 'asset_file'

  chat_sessions = relationship("ChatSession", back_populates="file_asset", cascade="all, delete-orphan")
  user = relationship("AuthUser", back_populates="file_asset")
  responses_api = relationship("ApiResponses", back_populates="file_asset", cascade="all, delete-orphan", passive_deletes=True, foreign_keys="ApiResponses.asset_file_id")

  id = Column(Integer, primary_key=True, index=True)
  status = Column(String, nullable=False, default="processing")
  filename = Column(String, nullable=False)
  filepath = Column(String, nullable=False)
  language = Column(String, nullable=False)
  call_length = Column(Integer, nullable=False, default=0)
  created_date_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
  modified_date_time = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

  started_at = Column(DateTime(timezone=True), nullable=True)
  completed_at = Column(DateTime(timezone=True), nullable=True)
  processing_stage = Column(String, nullable=True)
  error_reason = Column(String, nullable=True)

  analysis_output_mode = Column(String, nullable=False, default="english")  # english | audio_language
  transcript_mode = Column(String, nullable=False, default="original")      # original | bilingual
  target_language = Column(String, nullable=False, default="en")            # en for now


  user_auth_id = Column(Integer, ForeignKey('auth_user.id', ondelete="CASCADE"), nullable=False)

class ApiResponses(Base):
  __tablename__ = 'api_responses'

  file_asset = relationship("AssetFile", back_populates="responses_api", foreign_keys="ApiResponses.asset_file_id")

  id = Column(Integer, primary_key=True, index=True)

  # -------- RAW PROVIDER OUTPUTS --------
  transcript_raw = Column(JSON, nullable=False)
  assemblyai_raw = Column(JSON, nullable=False)
  gemini_raw = Column(JSON, nullable=False)

  sentence_sentiment = Column(JSON, nullable=False)


  # -------- USAGE / COSTING --------
  transcription_usage = Column(JSON, nullable=False)
  llm_usage = Column(JSON, nullable=False)

  # -------- NORMALIZED INTERNAL DATA --------
  normalized_transcript = Column(JSON, nullable=False)
  normalized_insights = Column(JSON, nullable=False)
  performance_metrics = Column(JSON, nullable=False)

  # -------- FINAL MASTER JSON --------
  master_json = Column(JSON, nullable=False)

  created_at = Column(DateTime(timezone=True),default=lambda: datetime.now(timezone.utc))

  analysis_translations = Column(JSON, nullable=False, default=dict, server_default=text("'{}'"),)

  asset_file_id = Column(Integer, ForeignKey('asset_file.id', ondelete="CASCADE"), nullable=False, unique=True)

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    asset_file_id = Column(Integer, ForeignKey("asset_file.id", ondelete="CASCADE"), nullable=False)
    user_auth_id = Column(Integer, ForeignKey("auth_user.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=True)
    messages = Column(JSONB, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    file_asset = relationship("AssetFile", back_populates="chat_sessions")
    user = relationship("AuthUser", back_populates="chat_sessions")