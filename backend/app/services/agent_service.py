import json
import uuid
from collections.abc import AsyncIterator
from datetime import date, datetime

from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.executor import create_executor
from app.agent.prompts import ANALYSIS_SYSTEM_PROMPT, INSIGHT_PROMPT
from app.config import settings
from app.models.chat_message import ChatMessage
from app.schemas.agent import AnalysisReport, InsightResponse
from app.services import transaction_service


async def _save_message(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str,
    content: str,
) -> ChatMessage:
    msg = ChatMessage(user_id=user_id, role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def stream_chat(
    db: AsyncSession,
    user_id: uuid.UUID,
    message: str,
) -> AsyncIterator[str]:
    await _save_message(db, user_id, "user", message)

    executor = create_executor(user_id)
    collected_tokens: list[str] = []

    async for msg, metadata in executor.astream(
        {"messages": [HumanMessage(content=message)]},
        stream_mode="messages",
    ):
        if (
            metadata.get("langgraph_node") == "model"
            and isinstance(msg, AIMessageChunk)
            and isinstance(msg.content, str)
            and msg.content
            and not msg.tool_call_chunks
        ):
            collected_tokens.append(msg.content)
            yield f"data: {json.dumps({'token': msg.content})}\n\n"

    full_response = "".join(collected_tokens)
    if full_response:
        await _save_message(db, user_id, "assistant", full_response)

    yield "data: [DONE]\n\n"


async def get_insight(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> InsightResponse:
    month = date.today().strftime("%Y-%m")

    summary = await transaction_service.get_monthly_summary(db, user_id, month)
    categories = await transaction_service.get_spending_by_category(db, user_id, month)

    context_json = json.dumps(
        {
            "summary": summary.model_dump(mode="json"),
            "categories": [c.model_dump(mode="json") for c in categories],
        }
    )

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        api_key=settings.google_api_key,
    )
    response = await llm.ainvoke(
        [SystemMessage(content=INSIGHT_PROMPT), HumanMessage(content=context_json)]
    )

    return InsightResponse(
        insight=str(response.content),
        generated_at=datetime.utcnow(),
    )


async def run_analysis(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> AnalysisReport:
    today = date.today()
    current_month = today.strftime("%Y-%m")
    if today.month == 1:
        prior_month = date(today.year - 1, 12, 1).strftime("%Y-%m")
    else:
        prior_month = date(today.year, today.month - 1, 1).strftime("%Y-%m")

    summary = await transaction_service.get_monthly_summary(db, user_id, current_month)
    categories = await transaction_service.get_spending_by_category(db, user_id, current_month)
    mom_comparison = await transaction_service.compare_months(db, user_id, prior_month, current_month)
    subscriptions = await transaction_service.detect_subscriptions(db, user_id)
    anomalies = await transaction_service.get_anomalies(db, user_id)

    context_json = json.dumps(
        {
            "summary": summary.model_dump(mode="json"),
            "categories": [c.model_dump(mode="json") for c in categories],
            "mom_comparison": mom_comparison,
            "subscriptions": subscriptions,
            "anomalies": anomalies,
        }
    )

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        api_key=settings.google_api_key,
    )
    structured_llm = llm.with_structured_output(AnalysisReport)
    result = await structured_llm.ainvoke(
        [SystemMessage(content=ANALYSIS_SYSTEM_PROMPT), HumanMessage(content=context_json)]
    )

    return result  # type: ignore[return-value]


async def get_chat_history(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 50,
) -> list[ChatMessage]:
    stmt = (
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return list(reversed(rows))
