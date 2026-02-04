from __future__ import annotations

from datetime import date, datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Union

try:
    _SL_TZ = ZoneInfo("Asia/Colombo")  # Sri Lanka Standard Time (UTC+05:30)
except Exception:
    # Windows environments may not have IANA tzdata installed.
    # Sri Lanka has a fixed offset (no DST), so a fixed-offset tz is safe here.
    _SL_TZ = timezone(timedelta(hours=5, minutes=30), name="Asia/Colombo")


def utc_now() -> datetime:
    """Timezone-aware current UTC time."""
    return datetime.now(timezone.utc)


def sl_now() -> datetime:
    """Timezone-aware current Sri Lanka time (Asia/Colombo)."""
    return datetime.now(_SL_TZ)


def utc_now_iso() -> str:
    """ISO-8601 UTC timestamp using a trailing 'Z'."""
    return utc_now().isoformat(timespec="seconds").replace("+00:00", "Z")


def sl_now_iso() -> str:
    """ISO-8601 Sri Lanka timestamp including +05:30 offset."""
    return sl_now().isoformat(timespec="seconds")


def sl_today() -> date:
    """Today's date in Sri Lanka (Asia/Colombo)."""
    return sl_now().date()


def sl_today_iso() -> str:
    """Today's date in Sri Lanka as YYYY-MM-DD."""
    return sl_today().isoformat()


def parse_iso_datetime(value: Union[str, datetime]) -> datetime:
    """Parse ISO datetime values robustly.

    - Accepts datetime or ISO string.
    - Accepts trailing 'Z'.
    - If the parsed datetime is naive, assumes legacy UTC (this codebase historically used datetime.utcnow()).

    Returns a timezone-aware datetime.
    """
    if isinstance(value, datetime):
        dt = value
    else:
        text = value.strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt
