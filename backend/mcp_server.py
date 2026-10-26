from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Any
from uuid import uuid4

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("staywise-mcp")

DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8000/api"
DEFAULT_TIMEOUT_SECONDS = 5.0


def backend_api_base_url() -> str:
    return os.getenv("MCP_BACKEND_API_BASE_URL", DEFAULT_BACKEND_API_BASE_URL).rstrip("/")


def upstream_timeout_seconds() -> float:
    raw = os.getenv("MCP_UPSTREAM_TIMEOUT_SECONDS")
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        value = float(raw)
        return value if value > 0 else DEFAULT_TIMEOUT_SECONDS
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


def make_error(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "error": {
            "code": code,
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


def http_get_json(url: str, timeout: float) -> dict[str, Any]:
    req = urllib.request.Request(
        url=url,
        method="GET",
        headers={"Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            if not raw:
                return {}
            data = json.loads(raw)
            if not isinstance(data, dict):
                raise RuntimeError("upstream_invalid_shape")
            return data
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore") if exc.fp else ""
        raise RuntimeError(f"upstream_http_error:{exc.code}:{body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"upstream_unreachable:{exc.reason}") from exc
    except json.JSONDecodeError as exc:
        raise RuntimeError("upstream_invalid_json") from exc


@mcp.tool()
def health_check() -> dict[str, Any]:
    """Check whether the Staywise hotel API is reachable."""
    base = backend_api_base_url()
    try:
        _ = http_get_json(f"{base}/hotels?page=1", upstream_timeout_seconds())
        return {
            "status": "OK",
            "mcp_server": "staywise-mcp",
            "backend_api_base_url": base,
            "backend_connected": True,
        }
    except Exception as exc:
        return make_error(
            "UPSTREAM_ERROR",
            "failed to reach backend API",
            {"reason": str(exc), "backend_api_base_url": base},
        )


@mcp.tool()
def search_hotels(
    location: str | None = None,
    check_in: str | None = None,
    check_out: str | None = None,
    guests: int | None = None,
    category: str | None = None,
    page: int = 1,
) -> dict[str, Any]:
    """Search the hotel catalogue by location and category with pagination.

    Dates and guest count are validated and forwarded, but room availability is
    not checked because booking inventory is not implemented yet.
    """
    try:
        in_date = parse_iso_date(check_in, "check_in") if check_in else None
        out_date = parse_iso_date(check_out, "check_out") if check_out else None
    except ValueError as exc:
        return make_error("INVALID_INPUT", str(exc))

    if in_date and out_date and out_date <= in_date:
        return make_error(
            "INVALID_INPUT",
            "check_out must be after check_in",
            {"field": "check_out"},
        )

    if guests is not None and guests < 1:
        return make_error(
            "INVALID_INPUT",
            "guests must be greater than or equal to 1",
            {"field": "guests", "value": guests},
        )

    if page < 1:
        return make_error(
            "INVALID_INPUT",
            "page must be greater than or equal to 1",
            {"field": "page", "value": page},
        )

    query: dict[str, Any] = {"page": page}
    if location:
        query["location"] = location
    if check_in:
        query["check_in"] = check_in
    if check_out:
        query["check_out"] = check_out
    if guests is not None:
        query["guests"] = guests
    if category:
        query["category"] = category

    url = f"{backend_api_base_url()}/hotels?{urllib.parse.urlencode(query)}"

    try:
        data = http_get_json(url, upstream_timeout_seconds())
    except Exception as exc:
        return make_error(
            "UPSTREAM_ERROR",
            "failed to fetch hotels from upstream service",
            {"reason": str(exc)},
        )

    hotels = data.get("hotels")
    total = data.get("total")
    count = data.get("count")
    if not isinstance(hotels, list) or not isinstance(total, int) or not isinstance(count, int):
        return make_error(
            "INTERNAL_ERROR",
            "unexpected response shape from upstream",
            {"url": url},
        )

    return {
        "hotels": hotels,
        "total": total,
        "count": count,
        "page": page,
    }


@mcp.tool()
def get_hotel_detail(hotel_id: int) -> dict[str, Any]:
    """Get the details for one hotel by its numeric ID."""
    if hotel_id < 1:
        return make_error(
            "INVALID_INPUT",
            "hotel_id must be greater than or equal to 1",
            {"field": "hotel_id", "value": hotel_id},
        )

    url = f"{backend_api_base_url()}/hotels/{hotel_id}"

    try:
        data = http_get_json(url, upstream_timeout_seconds())
    except RuntimeError as exc:
        msg = str(exc)
        if "upstream_http_error:404" in msg:
            return make_error("NOT_FOUND", "hotel not found", {"hotel_id": hotel_id})
        return make_error(
            "UPSTREAM_ERROR",
            "failed to fetch hotel detail from upstream service",
            {"reason": msg},
        )
    except Exception as exc:  # noqa: BLE001
        return make_error(
            "INTERNAL_ERROR",
            "unexpected error in get_hotel_detail",
            {"reason": str(exc)},
        )

    if not isinstance(data, dict) or "id" not in data:
        return make_error(
            "INTERNAL_ERROR",
            "unexpected response shape from upstream",
            {"url": url},
        )

    return data


if __name__ == "__main__":
    mcp.run(transport="stdio")
