use rusqlite::{params, Connection, OptionalExtension};

use crate::models::{AchievementRecord, StreakInfo};

pub const STREAK_ACHIEVEMENTS: &[(&str, i64)] = &[("streak-7", 7), ("streak-30", 30)];

/// Upsert a row of activity for a given local `activity_date` (YYYY-MM-DD).
pub fn record_activity(
    conn: &Connection,
    student_id: &str,
    activity_date: &str,
    duration_ms: i64,
    wpm: f64,
    accuracy: f64,
) -> crate::error::Result<()> {
    conn.execute(
        "INSERT INTO daily_activity (id, student_id, activity_date, session_count, total_duration_ms, best_wpm, accuracy_sum)
         VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6)
         ON CONFLICT(student_id, activity_date) DO UPDATE SET
            session_count = session_count + 1,
            total_duration_ms = total_duration_ms + excluded.total_duration_ms,
            best_wpm = MAX(best_wpm, excluded.best_wpm),
            accuracy_sum = accuracy_sum + excluded.accuracy_sum",
        params![crate::models::new_id("act"), student_id, activity_date, duration_ms, wpm, accuracy],
    )?;
    Ok(())
}

/// Compute current and longest streak (in days) from daily_activity, using local calendar dates.
/// `today` is the caller-provided local date (YYYY-MM-DD) so timezone handling stays in the UI layer.
pub fn compute_streak(
    conn: &Connection,
    student_id: &str,
    today: &str,
) -> crate::error::Result<StreakInfo> {
    let mut stmt = conn.prepare(
        "SELECT activity_date FROM daily_activity WHERE student_id = ?1 ORDER BY activity_date ASC",
    )?;
    let dates: Vec<String> = stmt
        .query_map(params![student_id], |r| r.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut longest = 0i64;
    let mut run = 0i64;
    let mut prev: Option<i32> = None;
    for d in &dates {
        let Some(days) = parse_day(d) else { continue };
        match prev {
            None => run = 1,
            Some(p) if days == p + 1 => run += 1,
            Some(p) if days <= p => run += 1,
            Some(_) => run = 1,
        }
        if run > longest {
            longest = run;
        }
        prev = Some(days);
    }

    let current = current_streak(&dates, today);

    Ok(StreakInfo { current, longest })
}

/// Current streak counts consecutive days ending today; if today has no activity yet,
/// a streak ending yesterday is still considered "current" (not yet broken).
fn current_streak(dates: &[String], today: &str) -> i64 {
    use std::collections::HashSet;
    let set: HashSet<String> = dates.iter().cloned().collect();
    if let Some(today_days) = parse_day(today) {
        if set.contains(today) {
            return count_back(&set, today_days);
        }
        if set.contains(format_day(today_days - 1).as_str()) {
            return count_back(&set, today_days - 1);
        }
    }
    0
}

fn count_back(set: &std::collections::HashSet<String>, start: i32) -> i64 {
    let mut days = start;
    let mut count = 0i64;
    while set.contains(format_day(days).as_str()) {
        count += 1;
        days -= 1;
    }
    count
}

fn format_day(days: i32) -> String {
    // days since epoch; convert to YYYY-MM-DD
    civil_from_days(UNIX_DAYS + days as i64)
}

// days from 1970-01-01 for the epoch (1970-01-01)
const UNIX_DAYS: i64 = 0;

fn parse_day(date: &str) -> Option<i32> {
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let y: i32 = parts[0].parse().ok()?;
    let m: i32 = parts[1].parse().ok()?;
    let d: i32 = parts[2].parse().ok()?;
    Some(days_from_civil(y, m, d))
}

/// Convert a days-since-epoch value to a (year, month, day) civil date (Howard Hinnant algorithm).
fn civil_from_days(z: i64) -> String {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}", y, m, d)
}

/// Convert a (year, month, day) civil date to days-since-epoch (Howard Hinnant algorithm).
fn days_from_civil(y: i32, m: i32, d: i32) -> i32 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as i64;
    let mp = ((m as i64) + 9) % 12;
    let doy = (153 * mp + 2) / 5 + (d as i64) - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    ((era as i64) * 146097 + doe - 719468) as i32
}

/// Evaluate which achievements a student qualifies for but has not yet unlocked, inserts them,
/// and returns the newly unlocked records.
pub fn evaluate_and_unlock(
    conn: &Connection,
    student_id: &str,
    current_streak_days: i64,
) -> crate::error::Result<Vec<AchievementRecord>> {
    let (avg_accuracy, best_wpm, total_duration_ms, session_count): (f64, f64, i64, i64) = conn
        .query_row(
            "SELECT
                COALESCE(AVG(accuracy), 0),
                COALESCE(MAX(wpm), 0),
                COALESCE(SUM(CASE WHEN status = 'completed' THEN duration_ms ELSE 0 END), 0),
                COUNT(*)
             FROM typing_sessions WHERE student_id = ?1",
            params![student_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )
        .optional()?
        .unwrap_or((0.0, 0.0, 0, 0));

    let total_minutes = total_duration_ms as f64 / 60000.0;
    let mut unlocked = std::collections::HashMap::new();
    for (id, v) in STREAK_ACHIEVEMENTS {
        unlocked.insert(id.to_string(), *v);
    }

    // Derived boolean criteria
    let mut want_tests: Vec<String> = Vec::new();
    if session_count >= 1 {
        want_tests.push("first-test".into());
    }
    if session_count >= 10 {
        want_tests.push("sessions-10".into());
    }
    if session_count >= 100 {
        want_tests.push("sessions-100".into());
    }
    let has_lesson_pass = conn
        .query_row(
            "SELECT COUNT(*) FROM lesson_progress WHERE student_id = ?1 AND completed = 1",
            params![student_id],
            |r| r.get::<_, i64>(0),
        )
        .optional()?
        .unwrap_or(0)
        >= 1;
    if has_lesson_pass {
        want_tests.push("lesson-pass".into());
    }
    for (id, threshold) in [
        ("wpm-30", 30.0),
        ("wpm-50", 50.0),
        ("wpm-80", 80.0),
        ("wpm-100", 100.0),
    ] {
        if best_wpm >= threshold {
            want_tests.push(id.to_string());
        }
    }
    for (id, threshold) in [("acc-95", 95.0), ("acc-99", 99.0)] {
        if avg_accuracy >= threshold {
            want_tests.push(id.to_string());
        }
    }
    for (id, minutes) in [("hours-1", 60.0), ("hours-10", 600.0)] {
        if total_minutes >= minutes {
            want_tests.push(id.to_string());
        }
    }
    for (id, days) in STREAK_ACHIEVEMENTS {
        if current_streak_days >= *days {
            want_tests.push((*id).to_string());
        }
    }

    let mut out = Vec::new();
    for id in want_tests {
        let exists: Option<String> = conn
            .query_row(
                "SELECT id FROM achievements WHERE student_id = ?1 AND achievement_id = ?2",
                params![student_id, id],
                |r| r.get(0),
            )
            .optional()?;
        if exists.is_none() {
            let at = crate::models::now_millis();
            conn.execute(
                "INSERT INTO achievements (id, student_id, achievement_id, unlocked_at)
                 VALUES (?1, ?2, ?3, ?4)",
                params![crate::models::new_id("ach"), student_id, id, at],
            )?;
            out.push(AchievementRecord {
                achievement_id: id,
                unlocked_at: at,
            });
        }
    }
    Ok(out)
}

/// Return all unlocked achievement records for a student, newest first.
pub fn list_unlocked(
    conn: &Connection,
    student_id: &str,
) -> crate::error::Result<Vec<AchievementRecord>> {
    let mut stmt = conn.prepare(
        "SELECT achievement_id, unlocked_at FROM achievements
         WHERE student_id = ?1 ORDER BY unlocked_at DESC",
    )?;
    let rows = stmt.query_map(params![student_id], |r| {
        Ok(AchievementRecord {
            achievement_id: r.get(0)?,
            unlocked_at: r.get(1)?,
        })
    })?;
    let mut out = Vec::new();
    for row in rows {
        out.push(row?);
    }
    Ok(out)
}

/// Test-only helper: convert a days-since-epoch value to a YYYY-MM-DD date string.
#[cfg(test)]
pub fn test_civil_from_days(days: i64) -> String {
    civil_from_days(days)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn days_roundtrip() {
        for day in [-100000i64, -1, 0, 1, 19723, 300000] {
            let date = civil_from_days(day);
            let parsed = parse_day(&date).expect("parseable");
            assert_eq!(parsed as i64, day);
        }
        // Known dates
        assert_eq!(
            civil_from_days(days_from_civil(2024, 1, 1) as i64),
            "2024-01-01"
        );
        assert_eq!(
            civil_from_days(days_from_civil(2024, 2, 29) as i64),
            "2024-02-29"
        );
        assert_eq!(
            civil_from_days(days_from_civil(2023, 12, 31) as i64),
            "2023-12-31"
        );
    }

    #[test]
    fn parse_day_ok() {
        assert_eq!(parse_day("2024-03-05"), Some(days_from_civil(2024, 3, 5)));
        assert_eq!(parse_day("bad"), None);
    }
}
