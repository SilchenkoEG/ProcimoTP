import { toFacilityLocal } from '../common/facility-time.js';

// The booking business rules as pure functions: no DB, no Nest, "now" passed in.
// The service calls them and turns a `false` into the matching API error.

export const ALLOWED_DURATIONS_HOURS = [1, 2] as const;
export const CANCELLATION_WINDOW_HOURS = 2;

const HOUR_MS = 60 * 60 * 1000;

export function endOf(startsAt: Date, hours: number): Date {
  return new Date(startsAt.getTime() + hours * HOUR_MS);
}

/** Slots are whole hours: 10:00 is valid, 10:30 or 10:00:05 are not. */
export function isOnTheHour(instant: Date): boolean {
  // Lisbon's UTC offset is always whole hours, so a UTC hour boundary is a local one.
  return instant.getTime() % HOUR_MS === 0;
}

/** A booking must start in the future; a slot that has already begun can't be booked. */
export function isInPast(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() <= now.getTime();
}

/**
 * The whole booking must fit inside the court's opening hours on one facility-local day.
 * Hours are "HH:mm" strings, which compare correctly as text.
 */
export function isWithinOpeningHours(
  court: { opensAt: string; closesAt: string },
  startsAt: Date,
  endsAt: Date,
): boolean {
  const start = toFacilityLocal(startsAt);
  const end = toFacilityLocal(endsAt);
  return (
    start.date === end.date &&
    start.time >= court.opensAt.slice(0, 5) &&
    end.time <= court.closesAt.slice(0, 5)
  );
}

/** Cancellation is allowed up to (and including) exactly 2 hours before the start. */
export function canCancel(startsAt: Date, now: Date): boolean {
  return now.getTime() <= startsAt.getTime() - CANCELLATION_WINDOW_HOURS * HOUR_MS;
}
