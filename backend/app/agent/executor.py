import uuid

from langchain.agents import create_agent
from langchain.agents.middleware.tool_call_limit import ToolCallLimitMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph.state import CompiledStateGraph

from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import create_tools
from app.config import settings


def create_executor(
    user_id: uuid.UUID,
    model: str = "gemini-flash-latest",
) -> CompiledStateGraph:
    llm = ChatGoogleGenerativeAI(
        model=model,
        api_key=settings.google_api_key,
    )
    tools = create_tools(user_id)
    limiter = ToolCallLimitMiddleware(run_limit=8, exit_behavior="end")
    return create_agent(
        model=llm,
        tools=tools,
        system_prompt=SYSTEM_PROMPT,
        middleware=[limiter],
        debug=settings.debug,
    )
