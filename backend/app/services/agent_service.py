import json
import uuid
from collections.abc import AsyncIterator
from datetime import date, datetime

from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy import delete, select
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
    import logging
    logger = logging.getLogger(__name__)

    await _save_message(db, user_id, "user", message)

    executor = create_executor(user_id)
    collected_tokens: list[str] = []

    try:
        async for msg, metadata in executor.astream(
            {"messages": [HumanMessage(content=message)]},
            stream_mode="messages",
        ):
            logger.debug(
                "stream chunk: node=%s type=%s has_tool_calls=%s content=%r",
                metadata.get("langgraph_node"),
                type(msg).__name__,
                bool(getattr(msg, "tool_call_chunks", None)),
                getattr(msg, "content", "")[:80] if hasattr(msg, "content") else "",
            )
            if (
                metadata.get("langgraph_node") == "model"
                and isinstance(msg, AIMessageChunk)
                and not msg.tool_call_chunks
            ):
                token: str | None = None
                if isinstance(msg.content, str) and msg.content:
                    token = msg.content
                elif isinstance(msg.content, list):
                    parts = [
                        block["text"]
                        for block in msg.content
                        if isinstance(block, dict) and block.get("type") == "text" and block.get("text")
                    ]
                    if parts:
                        token = "".join(parts)
                if token:
                    collected_tokens.append(token)
                    yield f"data: {json.dumps({'token': token})}\n\n"
    except Exception as exc:
        logger.exception("stream_chat agent error: %s", exc)
        error_token = f"Sorry, I ran into an error: {exc}"
        yield f"data: {json.dumps({'token': error_token})}\n\n"
        yield "data: [DONE]\n\n"
        return

    full_response = "".join(collected_tokens)
    logger.info("stream_chat complete: %d tokens, %d chars", len(collected_tokens), len(full_response))
    if full_response:
        await _save_message(db, user_id, "assistant", full_response)
    elif not collected_tokens:
        logger.warning("stream_chat: no tokens collected for message=%r", message)
        fallback = "I wasn't able to generate a response. Please try again."
        yield f"data: {json.dumps({'token': fallback})}\n\n"

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
        model="gemini-flash-latest",
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
        model="gemini-flash-latest",
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


async def clear_chat_history(db: AsyncSession, user_id: uuid.UUID) -> None:
    from sqlalchemy import delete
    await db.execute(delete(ChatMessage).where(ChatMessage.user_id == user_id))
    await db.commit()
