import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// The facility's local time zone. Opening hours ("08:00") and calendar days
// ("2030-01-10") are facility-local; instants are stored in the DB as timestamptz (UTC).
export const FACILITY_TIMEZONE = 'Europe/Lisbon';

/** Today's calendar date at the facility, as YYYY-MM-DD. */
export function facilityToday(now: Date = new Date()): string {
  return dayjs(now).tz(FACILITY_TIMEZONE).format('YYYY-MM-DD');
}

/** Shift a YYYY-MM-DD calendar date by whole days. */
export function addDays(date: string, days: number): string {
  return dayjs(date).add(days, 'day').format('YYYY-MM-DD');
}

/** The instant of a facility-local wall-clock time on a date, e.g. ("2030-01-10", "08:00"). */
export function facilityDateTime(date: string, time: string): Date {
  return dayjs.tz(`${date} ${time}`, FACILITY_TIMEZONE).toDate();
}
