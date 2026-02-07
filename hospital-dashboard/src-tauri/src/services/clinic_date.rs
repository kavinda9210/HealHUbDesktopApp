use chrono::{Datelike, Duration, NaiveDate, Weekday};

use crate::error::{AppError, AppResult};

pub fn fourth_tuesday(year: i32, month: u32) -> AppResult<NaiveDate> {
    let first_day = NaiveDate::from_ymd_opt(year, month, 1)
        .ok_or_else(|| AppError::Validation("invalid year/month".to_string()))?;

    let mut date = first_day;
    while date.weekday() != Weekday::Tue {
        date = date + Duration::days(1);
    }

    // First Tuesday found; add 3 weeks to reach 4th Tuesday.
    Ok(date + Duration::days(21))
}

pub fn next_default_clinic_date(from_date: NaiveDate) -> AppResult<NaiveDate> {
    let year = from_date.year();
    let month = from_date.month();
    let this_month = fourth_tuesday(year, month)?;
    if this_month > from_date {
        return Ok(this_month);
    }

    let (next_year, next_month) = if month == 12 { (year + 1, 1) } else { (year, month + 1) };
    fourth_tuesday(next_year, next_month)
}
