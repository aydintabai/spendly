import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    message: str


class ChatMessageRead(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InsightResponse(BaseModel):
    insight: str
    generated_at: datetime


class AnalysisReport(BaseModel):
    monthly_summary: str
    top_categories: list[dict]
    mom_changes: dict
    subscriptions: list[dict]
    anomalies: list[dict]
    recommendations: list[str]
