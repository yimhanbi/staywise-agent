"""Ollama chat orchestration using tools discovered from the Staywise MCP server."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from typing import Any, Awaitable, Callable


CallTool = Callable[[str, dict[str, Any]], Awaitable[Any]]
ProgressCallback = Callable[[str], None]
TokenCallback = Callable[[str], None]
logger = logging.getLogger("staywise.ai")

SYSTEM_PROMPT = """너는 Staywise의 한국어 숙소 검색 도우미다.
사용자의 의도를 대화 맥락과 함께 이해하고, 숙소 목록이나 숙소 상세 정보처럼 최신 데이터가 필요한 질문에는 제공된 MCP 도구를 호출한다. 도구 결과에 없는 숙소, 가격, 평점, 시설, 예약 가능 여부를 만들어내지 않는다.
숙소 검색 결과는 검색 도구가 반환한 데이터만 근거로 안내한다. 검색 조건이 모호하면 짧게 되물어볼 수 있다. 날짜는 YYYY-MM-DD 형식으로 전달한다. 인원수가 없으면 임의로 정하지 말고 검색 도구에서 생략한다.
예약과 결제는 검색 결과 카드의 예약 버튼을 통해 체크아웃 화면에서 진행한다. 예약/결제 버튼을 누르거나 결제가 승인되었다고 말하지 않는다. 실제 날짜별 객실 재고는 확인할 수 없으므로 예약 가능 여부를 보장하지 않는다. 사용자가 예약을 원하면 적합한 검색 결과의 예약하기 버튼을 안내한다.
자연스럽고 간결한 한국어로 답한다. 대화 이력이 비어 있으면 Staywise AI임을 짧게 소개하고 여행 조건을 자유롭게 말해 달라고 인사한다."""

def _ollama_schema(schema: Any) -> dict[str, Any]:
    """Convert an MCP JSON Schema object to Ollama's function parameter schema."""
    if not isinstance(schema, dict):
        return {"type": "object", "properties": {}}

    alternatives = schema.get("anyOf") or schema.get("oneOf")
    if isinstance(alternatives, list):
        non_null = [item for item in alternatives if isinstance(item, dict) and item.get("type") != "null"]
        if len(non_null) == 1:
            schema = {**non_null[0], **{key: value for key, value in schema.items() if key not in {"anyOf", "oneOf"}}}

    result: dict[str, Any] = {}
    for key in ("type", "description", "enum", "minimum", "maximum", "minLength", "maxLength", "pattern"):
        if key in schema:
            result[key] = schema[key]
    if isinstance(schema.get("properties"), dict):
        result["properties"] = {
            name: _ollama_schema(property_schema)
            for name, property_schema in schema["properties"].items()
        }
    if isinstance(schema.get("items"), dict):
        result["items"] = _ollama_schema(schema["items"])
    if isinstance(schema.get("required"), list):
        result["required"] = schema["required"]
    if result.get("type") == "object" or "properties" in result:
        result.setdefault("type", "object")
        result.setdefault("properties", {})
    return result


def _ollama_tools(mcp_tools: list[Any]) -> list[dict[str, Any]]:
    """Build Ollama function definitions directly from MCP tools/list results."""
    tools = []
    for tool in mcp_tools:
        name = getattr(tool, "name", None)
        if not name:
            continue
        tools.append({
            "type": "function",
            "function": {
                "name": name,
                "description": getattr(tool, "description", None) or f"MCP 도구 {name}",
                "parameters": _ollama_schema(getattr(tool, "inputSchema", None)),
            },
        })
    return tools


def _ollama_request(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]],
    allow_tools: bool = True,
    on_progress: ProgressCallback | None = None,
    on_token: TokenCallback | None = None,
) -> dict[str, Any]:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "gemma4:e2b").strip()
    payload = json.dumps(
        {
            "model": model,
            "messages": messages,
            "stream": True,
            **({"tools": tools} if allow_tools and tools else {}),
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    started_at = time.monotonic()
    logger.info(
        "Ollama stream started: model=%s message_count=%d tools=%s",
        model,
        len(messages),
        allow_tools,
    )
    if on_progress:
        on_progress("Staywise 모델이 답변을 생성하고 있어요…")
    assembled_message: dict[str, Any] = {"role": "assistant", "content": ""}
    assembled_tool_calls: dict[int, dict[str, Any]] = {}
    final_metadata: dict[str, Any] = {}
    saw_chunk = False
    printed_content = False
    logger.info(
        "Ollama generation started: model=%s",
        model,
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            for raw_line in response:
                if not raw_line.strip():
                    continue
                chunk = json.loads(raw_line.decode("utf-8"))
                saw_chunk = True
                chunk_message = chunk.get("message") or {}
                content = chunk_message.get("content") or ""
                if content:
                    assembled_message["content"] += content
                    if on_token:
                        on_token(content)
                    if not printed_content:
                        print(f"\n[Ollama {model}] ", end="", flush=True)
                        printed_content = True
                    print(content, end="", flush=True)

                for position, tool_call in enumerate(chunk_message.get("tool_calls") or []):
                    function = tool_call.get("function") or {}
                    call_index = int(tool_call.get("index", position))
                    current = assembled_tool_calls.setdefault(
                        call_index, {"type": "function", "function": {"arguments": {}}}
                    )
                    if function.get("name"):
                        current["function"]["name"] = function["name"]
                    arguments = function.get("arguments")
                    if isinstance(arguments, dict):
                        current["function"]["arguments"].update(arguments)

                final_metadata = {
                    key: value
                    for key, value in chunk.items()
                    if key not in {"message", "done"}
                }
                if chunk.get("done"):
                    final_metadata["done"] = True
            if printed_content:
                print(flush=True)
    except urllib.error.HTTPError as exc:
        logger.error(
            "Ollama returned HTTP error: model=%s status=%d elapsed=%.1fs",
            model,
            exc.code,
            time.monotonic() - started_at,
        )
        if exc.code == 404:
            raise RuntimeError(
                f"Ollama 모델 '{model}'을 찾지 못했습니다. `ollama pull {model}`을 실행해 주세요."
            ) from exc
        raise RuntimeError(f"Ollama 요청이 실패했습니다 (HTTP {exc.code}).") from exc
    except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
        logger.exception(
            "Ollama connection failed: model=%s elapsed=%.1fs",
            model,
            time.monotonic() - started_at,
        )
        raise RuntimeError(
            "Ollama에 연결할 수 없습니다. Ollama 앱을 실행하거나 `ollama serve`를 실행해 주세요."
        ) from exc
    except json.JSONDecodeError as exc:
        logger.exception("Ollama returned invalid JSON: model=%s", model)
        raise RuntimeError("Ollama가 올바르지 않은 응답을 반환했습니다.") from exc

    if not saw_chunk:
        logger.error("Ollama returned an empty stream: model=%s", model)
        raise RuntimeError("Ollama 응답에 message가 없습니다.")
    if assembled_tool_calls:
        assembled_message["tool_calls"] = [
            assembled_tool_calls[index] for index in sorted(assembled_tool_calls)
        ]
    data = {**final_metadata, "message": assembled_message}
    logger.info(
        "Ollama stream completed: model=%s elapsed=%.1fs prompt_tokens=%s output_tokens=%s tool_calls=%d",
        model,
        time.monotonic() - started_at,
        data.get("prompt_eval_count", "unknown"),
        data.get("eval_count", "unknown"),
        len(data["message"].get("tool_calls") or []),
    )
    return data


def _compact_tool_result(name: str, result: Any) -> Any:
    if name == "search_hotels" and isinstance(result, dict):
        hotels = result.get("hotels", [])
        return {
            "total": result.get("total", len(hotels) if isinstance(hotels, list) else 0),
            "count": result.get("count", len(hotels) if isinstance(hotels, list) else 0),
            "hotels": hotels[:10] if isinstance(hotels, list) else [],
        }
    if isinstance(result, dict):
        return result
    return {"result": result}


def _search_fallback_from_history(history: list[dict[str, str]]) -> dict[str, Any] | None:
    """Recover common search conditions if a small model narrates but skips its tool call."""
    user_text = " ".join(
        str(message.get("content", ""))
        for message in history[-10:]
        if message.get("role") == "user"
    )
    if not user_text or not any(word in user_text for word in ("찾아", "검색", "추천", "보여")):
        return None

    regions = (
        "강원특별자치도", "경기도", "경상북도", "경상남도", "전라북도", "전라남도", "충청북도", "충청남도",
        "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "제주", "강릉", "속초", "홍천",
        "춘천", "전주", "경주", "여수", "통영", "포항", "목포", "파주", "성주", "수원", "양양", "평창",
    )
    location = next((region for region in regions if region in user_text), None)

    guests_match = re.search(r"(?<!\d)(\d{1,2})\s*(?:명|인|분)", user_text)
    guests = int(guests_match.group(1)) if guests_match else None

    category_codes = {
        "한옥": "B02011600",
        "게스트하우스": "B02011100",
        "유스호스텔": "B02010600",
        "호스텔": "B02011000",
        "민박": "B02011200",
        "캠핑": "A02030100",
        "야영장": "A02030100",
        "모텔": "B02010900",
        "펜션": "B02010700",
        "리조트": "B02010500",
        "호텔": "B02010100",
    }
    category = next((code for label, code in category_codes.items() if label in user_text), None)

    check_in = check_out = None
    iso_dates = re.findall(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b", user_text)
    try:
        if len(iso_dates) >= 2:
            check_in = date(*(int(part) for part in iso_dates[0])).isoformat()
            check_out = date(*(int(part) for part in iso_dates[1])).isoformat()
        else:
            match = re.search(
                r"(?:(20\d{2})년\s*)?(\d{1,2})월\s*(\d{1,2})일?\s*(?:부터|~|-)\s*(?:(20\d{2})년\s*)?(?:(\d{1,2})월\s*)?(\d{1,2})일?",
                user_text,
            )
            if match:
                start_year = int(match.group(1) or date.today().year)
                start_month, start_day = int(match.group(2)), int(match.group(3))
                end_year = int(match.group(4) or start_year)
                end_month = int(match.group(5) or start_month)
                end_day = int(match.group(6))
                start_date = date(start_year, start_month, start_day)
                end_date = date(end_year, end_month, end_day)
                if not match.group(1) and start_date < date.today():
                    start_date = start_date.replace(year=start_date.year + 1)
                    end_date = end_date.replace(year=max(end_date.year + 1, start_date.year))
                check_in, check_out = start_date.isoformat(), end_date.isoformat()
    except ValueError:
        check_in = check_out = None

    return {
        "location": location,
        "check_in": check_in,
        "check_out": check_out,
        "guests": guests,
        "category": category,
        "page": 1,
    }


async def run_agent(
    history: list[dict[str, str]],
    call_tool: CallTool,
    mcp_tools: list[Any],
    on_progress: ProgressCallback | None = None,
    on_token: TokenCallback | None = None,
    on_reset: Callable[[], None] | None = None,
) -> dict[str, Any]:
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    ollama_tools = _ollama_tools(mcp_tools)
    available_tool_names = {item["function"]["name"] for item in ollama_tools}
    logger.info("MCP tools discovered: names=%s", sorted(available_tool_names))
    latest_search: dict[str, Any] | None = None
    fallback_search_done = False

    # Bound tool loops so a model that repeats a call cannot keep a request alive forever.
    for _ in range(4):
        response = await asyncio.to_thread(
            _ollama_request,
            messages,
            tools=ollama_tools,
            on_progress=on_progress,
            on_token=on_token,
        )
        assistant_message = response["message"]
        messages.append(assistant_message)
        tool_calls = assistant_message.get("tool_calls") or []
        if not tool_calls:
            fallback_arguments = (
                _search_fallback_from_history(history)
                if not fallback_search_done
                else None
            )
            if fallback_arguments is not None and "search_hotels" in available_tool_names:
                fallback_search_done = True
                if on_reset:
                    on_reset()
                if on_progress:
                    on_progress("검색 조건을 확인해 숙소를 찾고 있어요…")
                try:
                    tool_result = await call_tool("search_hotels", fallback_arguments)
                except Exception as exc:
                    logger.exception("Fallback hotel search failed: error_type=%s", type(exc).__name__)
                    tool_result = {"error": str(exc), "hotels": [], "total": 0}
                compact_result = _compact_tool_result("search_hotels", tool_result)
                latest_search = {
                    "hotels": compact_result.get("hotels", []) if isinstance(compact_result, dict) else [],
                    "total": compact_result.get("total", 0) if isinstance(compact_result, dict) else 0,
                    "search": fallback_arguments,
                }
                messages.append({
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [{
                        "type": "function",
                        "function": {"name": "search_hotels", "arguments": fallback_arguments},
                    }],
                })
                messages.append({
                    "role": "tool",
                    "tool_name": "search_hotels",
                    "content": json.dumps(compact_result, ensure_ascii=False),
                })
                continue
            return {
                "reply": str(assistant_message.get("content", "")).strip(),
                "hotels": latest_search.get("hotels", []) if latest_search else [],
                "total": latest_search.get("total", 0) if latest_search else 0,
                "search": latest_search.get("search") if latest_search else None,
            }

        # Discard any pre-tool narration from the live draft. The final model
        # answer after MCP returns is the response shown as the assistant turn.
        if on_reset:
            on_reset()
        for item in tool_calls:
            function = item.get("function", {}) if isinstance(item, dict) else {}
            name = function.get("name")
            arguments = function.get("arguments", {})
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {}
            if not isinstance(arguments, dict) or name not in available_tool_names:
                logger.error("Model requested invalid tool call: tool=%s", name)
                tool_result: Any = {"error": "지원하지 않거나 잘못된 도구 요청입니다."}
                name = str(name or "unknown")
            else:
                logger.info("Model requested MCP tool: tool=%s", name)
                if on_progress:
                    on_progress(
                        "MCP로 숙소를 검색하고 있어요…"
                        if name == "search_hotels"
                        else "숙소 상세 정보를 확인하고 있어요…"
                    )
                try:
                    if name == "search_hotels":
                        arguments["page"] = max(1, min(20, int(arguments.get("page", 1))))
                        if arguments.get("guests") is not None:
                            arguments["guests"] = max(1, min(30, int(arguments["guests"])))
                    tool_result = await call_tool(name, arguments)
                    if on_progress and name == "search_hotels":
                        count = len(tool_result.get("hotels", [])) if isinstance(tool_result, dict) else 0
                        on_progress(f"숙소 {count}개를 받아 답변을 정리하고 있어요…")
                except Exception as exc:  # Keep tool failures in the model context for a useful answer.
                    logger.exception(
                        "MCP tool failed during AI chat: tool=%s error_type=%s",
                        name,
                        type(exc).__name__,
                    )
                    tool_result = {"error": str(exc)}

            compact_result = _compact_tool_result(name, tool_result)
            if name == "search_hotels" and isinstance(compact_result, dict):
                search_args = arguments if isinstance(arguments, dict) else {}
                latest_search = {
                    "hotels": compact_result.get("hotels", []),
                    "total": compact_result.get("total", 0),
                    "search": {
                        "location": search_args.get("location"),
                        "category": search_args.get("category"),
                        "guests": search_args.get("guests"),
                        "check_in": search_args.get("check_in"),
                        "check_out": search_args.get("check_out"),
                    },
                }
            messages.append(
                {
                    "role": "tool",
                    "tool_name": name,
                    "content": json.dumps(compact_result, ensure_ascii=False),
                }
            )

    # A final call without tool definitions lets the model summarize the last tool result.
    messages.append({"role": "user", "content": "도구 결과를 바탕으로 사용자에게 간결하게 답해 주세요."})
    response = await asyncio.to_thread(
        _ollama_request,
        messages,
        tools=ollama_tools,
        allow_tools=False,
        on_progress=on_progress,
        on_token=on_token,
    )
    message = response["message"]
    return {
        "reply": str(message.get("content", "요청하신 내용을 확인했습니다.")).strip(),
        "hotels": latest_search.get("hotels", []) if latest_search else [],
        "total": latest_search.get("total", 0) if latest_search else 0,
        "search": latest_search.get("search") if latest_search else None,
    }
