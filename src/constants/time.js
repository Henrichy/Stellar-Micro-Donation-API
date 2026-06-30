/**
 * Time Constants — Pure Invariants Layer
 *
 * RESPONSIBILITY: Single source of truth for time-unit conversions used across the app.
 * OWNER: Platform Team
 * DEPENDENCIES: None (foundational module)
 *
 * These are physical invariants (millisecond durations) — not tunables.
 * For env-overridable durations/TTL values, see src/config/.
 */

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;

const MONTHLY_WINDOW_DAY = 1; // first day of the month, used by monthly rolling windows

const Object_frozen_Object = Object.freeze({
  MS_PER_SECOND,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  MS_PER_WEEK,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
  MONTHLY_WINDOW_DAY,
});

module.exports = Object_frozen_Object;
