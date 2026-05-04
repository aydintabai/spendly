from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.dependencies import CurrentUser, DBSession
from app.schemas.agent import AnalysisReport, ChatMessageRead, ChatRequest, InsightResponse
from app.services import agent_service

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: DBSession,
    user: CurrentUser,
) -> StreamingResponse:
    return StreamingResponse(
        agent_service.stream_chat(db, user.id, body.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/insight", response_model=InsightResponse)
async def get_insight(
    db: DBSession,
    user: CurrentUser,
) -> InsightResponse:
    return await agent_service.get_insight(db, user.id)


@router.post("/analyze", response_model=AnalysisReport)
async def analyze(
    db: DBSession,
    user: CurrentUser,
) -> AnalysisReport:
    return await agent_service.run_analysis(db, user.id)


@router.get("/history", response_model=list[ChatMessageRead])
async def get_history(
    db: DBSession,
    user: CurrentUser,
) -> list[ChatMessageRead]:
    messages = await agent_service.get_chat_history(db, user.id)
    return [ChatMessageRead.model_validate(m) for m in messages]


@router.delete("/history", status_code=204)
async def clear_history(
    db: DBSession,
    user: CurrentUser,
) -> None:
    await agent_service.clear_chat_history(db, user.id)
