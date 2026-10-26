"""Canonical accommodation category codes and conservative name fallbacks."""

from __future__ import annotations

from typing import Optional


CATEGORY_GROUPS: dict[str, tuple[tuple[str, ...], tuple[str, ...]]] = {
    "B02010100": (("B02010100",), ("호텔", "hotel")),
    # Tourism data may classify resorts as either condominium category.
    "B02010500": (("B02010500", "B02011300"), ("리조트", "콘도", "condo", "resort")),
    "B02010600": (("B02010600",), ("유스호스텔", "youth hostel")),
    "B02010700": (("B02010700",), ("펜션", "pension")),
    "B02010900": (("B02010900",), ("모텔", "motel")),
    "B02011000": (("B02011000",), ("호스텔", "hostel")),
    "B02011100": (("B02011100",), ("게스트하우스", "게스트 하우스", "guesthouse")),
    "B02011200": (("B02011200",), ("민박",)),
    "B02011600": (("B02011600",), ("한옥", "고택")),
    "A02030100": (("A02030100",), ("캠핑", "야영장", "글램핑", "오토캠핑", "camping")),
}

CATEGORY_ALIASES: dict[str, str] = {
    "호텔": "B02010100", "관광호텔": "B02010100",
    "리조트": "B02010500", "콘도": "B02010500", "콘도미니엄": "B02010500",
    "유스호스텔": "B02010600",
    "펜션": "B02010700",
    "모텔": "B02010900",
    "호스텔": "B02011000",
    "게스트하우스": "B02011100", "게스트 하우스": "B02011100",
    "민박": "B02011200",
    "한옥": "B02011600", "고택": "B02011600",
    "캠핑": "A02030100", "야영장": "A02030100", "글램핑": "A02030100",
}
CATEGORY_ALIASES["B02011300"] = "B02010500"


def category_filter(category: Optional[str]) -> tuple[tuple[str, ...], tuple[str, ...]]:
    """Resolve a UI label or official code into stored codes and title keywords."""
    if not category or category.strip() in {"", "전체"}:
        return (), ()

    value = category.strip()
    code = value if value in CATEGORY_GROUPS else CATEGORY_ALIASES.get(value)
    if code:
        return CATEGORY_GROUPS[code]
    # Unknown values are matched literally against the stored category column.
    return (value,), ()


def infer_category_from_name(name: Optional[str]) -> Optional[str]:
    """Infer a category only when the accommodation name contains an explicit type."""
    normalized = (name or "").casefold().replace(" ", "")
    if not normalized:
        return None

    # More specific labels must win before their broader substrings.
    ordered = (
        ("B02010600", ("유스호스텔",)),
        ("B02011100", ("게스트하우스",)),
        ("B02011600", ("한옥", "고택")),
        ("A02030100", ("오토캠핑", "글램핑", "캠핑", "야영장")),
        ("B02010500", ("리조트", "콘도")),
        ("B02010700", ("펜션",)),
        ("B02010900", ("모텔",)),
        ("B02011000", ("호스텔",)),
        ("B02011200", ("민박",)),
        ("B02010100", ("호텔",)),
    )
    for code, keywords in ordered:
        if any(keyword.replace(" ", "") in normalized for keyword in keywords):
            return code
    return None
