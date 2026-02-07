from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Iterable, List, Optional


MEAL_DEFAULT_TIMES = {
    "breakfast": "08:00",
    "lunch": "13:00",
    "dinner": "20:00",
}


def normalize_time_str(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("Time is required")

    parts = text.split(":")
    if len(parts) != 2:
        raise ValueError("Time must be in HH:MM format")

    hour = int(parts[0])
    minute = int(parts[1])
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError("Time must be a valid 24h time")

    return f"{hour:02d}:{minute:02d}"


def normalize_times(
    *,
    specific_times: Optional[Iterable[str]] = None,
    meal_times: Optional[Iterable[str]] = None,
    times_per_day: int = 1,
) -> List[str]:
    if specific_times:
        times = [normalize_time_str(t) for t in specific_times]
        return sorted(list(dict.fromkeys(times)))

    if meal_times:
        times: List[str] = []
        for m in meal_times:
            key = (m or "").strip().lower()
            if key not in MEAL_DEFAULT_TIMES:
                raise ValueError("meal_times must be one of: breakfast, lunch, dinner")
            times.append(MEAL_DEFAULT_TIMES[key])
        times = [normalize_time_str(t) for t in times]
        return sorted(list(dict.fromkeys(times)))

    # Fallback: single reminder time.
    if times_per_day <= 1:
        return [MEAL_DEFAULT_TIMES["breakfast"]]

    # Simple evenly spaced defaults (kept minimal).
    defaults = ["08:00", "13:00", "20:00"]
    return defaults[: min(times_per_day, len(defaults))]


def _fourth_weekday_of_month(year: int, month: int, weekday: int) -> date:
    """weekday: Monday=0 ... Sunday=6"""
    first = date(year, month, 1)
    # First desired weekday in the month
    days_ahead = (weekday - first.weekday()) % 7
    first_occurrence = first + timedelta(days=days_ahead)
    # 4th occurrence
    return first_occurrence + timedelta(days=21)


def next_fourth_tuesday(from_date: date) -> date:
    """Returns the next 4th-Tuesday date on/after from_date.

    Interpretation used (simple + deterministic):
    - Use the 4th Tuesday of the current month if it is >= from_date.
    - Otherwise use the 4th Tuesday of the next month.
    """
    fourth_this_month = _fourth_weekday_of_month(from_date.year, from_date.month, weekday=1)
    if fourth_this_month >= from_date:
        return fourth_this_month

    # Move to next month
    year = from_date.year + (1 if from_date.month == 12 else 0)
    month = 1 if from_date.month == 12 else from_date.month + 1
    return _fourth_weekday_of_month(year, month, weekday=1)


def daterange(start: date, end_inclusive: date):
    current = start
    while current <= end_inclusive:
        yield current
        current += timedelta(days=1)
