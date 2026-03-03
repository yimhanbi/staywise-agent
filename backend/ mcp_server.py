from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.requests
from datetime import datetime
from typing import Any
from uuid import uuid4

from mcp.server.fastmcp import fastmcp

mcp = FastMCP("staywise-mcp")

DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8000/api"
DEFAULT_TIMEOUT_SECONDS = 5.0

def backend_api_base_url() -> str:
    return os.getenv("MCP_BACKEND_API_BASE_URL",DEFAULT_BACKEND_API_BASE_URL).rstrip("/")

def upstream_timeout_seconds() -> float:
    raw = os.getenv("MCP_UPSTREAM_TIMEOUT_SECONDS")
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        value = float(raw)
        return value if value > 0 else DEFAULT_TIMEOUT_SECONDS
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS

def make_error(code: str, message: str, details:dict[str,Any] | None = None) -> dict[str,Any]:
    return{
        "error": {
            "code":code,
            "message": message,
            "details": details or {},
            "request_id": f"req_{uuid4().hex[:12]}",
        }
    }
    
def parse_iso_date(value: str, field_name: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError(f"{field_name} must be YYYY-MM-DD") from exc
    
def http_get_json(url: str, timeout:float) -> dict[str, Any]:
    req = urllib.request.Request(
        url=url,
        method="GET",
        headers={"Accept": "application/json"},
    )
    try:
        with urllib.request.urlop
