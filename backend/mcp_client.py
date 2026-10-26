"""Small stdio MCP client used by the FastAPI routes."""

from __future__ import annotations

import json
import os
import sys
from contextlib import AsyncExitStack
from pathlib import Path
from typing import Any

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


MCP_SERVER_PATH = Path(__file__).with_name("mcp_server.py")


def _server_environment() -> dict[str, str]:
    # Pass only the environment needed to launch the local tool server.
    env = {
        key: os.environ[key]
        for key in ("PATH", "HOME", "LANG", "TMPDIR", "PYTHONPATH")
        if os.environ.get(key)
    }
    env["MCP_BACKEND_API_BASE_URL"] = os.getenv(
        "MCP_BACKEND_API_BASE_URL", "http://localhost:8000/api"
    )
    env["MCP_UPSTREAM_TIMEOUT_SECONDS"] = os.getenv(
        "MCP_UPSTREAM_TIMEOUT_SECONDS", "5"
    )
    return env


def _decode_tool_result(result: Any) -> Any:
    if getattr(result, "isError", False) or getattr(result, "is_error", False):
        raise RuntimeError("MCP tool returned an error")

    structured = getattr(result, "structuredContent", None) or getattr(
        result, "structured_content", None
    )
    if structured is not None:
        return structured

    for item in getattr(result, "content", []):
        text = getattr(item, "text", None)
        if text:
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return {"text": text}

    return {}


async def call_mcp_tool(tool_name: str, arguments: dict[str, Any] | None = None) -> Any:
    """Launch the MCP server, call one tool over stdio, then close it."""
    async with MCPToolSession() as mcp_session:
        return await mcp_session.call_tool(tool_name, arguments)


class MCPToolSession:
    """One initialized MCP connection shared across discovery and tool calls."""

    def __init__(self) -> None:
        self._exit_stack: AsyncExitStack | None = None
        self._session: ClientSession | None = None

    async def __aenter__(self) -> "MCPToolSession":
        self._exit_stack = AsyncExitStack()
        await self._exit_stack.__aenter__()
        server = StdioServerParameters(
            command=sys.executable,
            args=[str(MCP_SERVER_PATH)],
            env=_server_environment(),
        )
        try:
            read_stream, write_stream = await self._exit_stack.enter_async_context(stdio_client(server))
            self._session = await self._exit_stack.enter_async_context(
                ClientSession(read_stream, write_stream)
            )
            await self._session.initialize()
            return self
        except BaseException:
            await self._exit_stack.aclose()
            self._exit_stack = None
            self._session = None
            raise

    async def __aexit__(self, exc_type: Any, exc: Any, traceback: Any) -> None:
        if self._exit_stack is not None:
            await self._exit_stack.__aexit__(exc_type, exc, traceback)
        self._exit_stack = None
        self._session = None

    async def list_tools(self) -> list[Any]:
        if self._session is None:
            raise RuntimeError("MCP session is not connected")
        result = await self._session.list_tools()
        return list(result.tools)

    async def call_tool(self, tool_name: str, arguments: dict[str, Any] | None = None) -> Any:
        if self._session is None:
            raise RuntimeError("MCP session is not connected")
        result = await self._session.call_tool(tool_name, arguments or {})
        return _decode_tool_result(result)
