import { facilityDateTime } from '../common/facility-time.js';

// Pure functions (no DB, no clock) so the slot rules are trivially unit-testable.

export interface Slot {
  /** Facility-local start, "HH:00". */
  time: string;
  startsAt: Date;
  endsAt: Date;
}

const hour = (h: number) => `${String(h).padStart(2, '0')}:00`;

/**
 * The 1-hour slots of a court on a facility-local date, from opening to closing.
 * opensAt "08:00", closesAt "11:00" → 08:00, 09:00, 10:00 (the last slot ends at closing).
 * Each slot is built from local wall-clock times, so it stays correct across DST changes.
 */
export function buildDaySlots(date: string, opensAt: string, closesAt: string): Slot[] {
  const first = Number(opensAt.slice(0, 2));
  const last = Number(closesAt.slice(0, 2));
  const slots: Slot[] = [];
  for (let h = first; h < last; h++) {
    slots.push({
      time: hour(h),
      startsAt: facilityDateTime(date, hour(h)),
      endsAt: facilityDateTime(date, hour(h + 1)),
    });
  }
  return slots;
}

/** Half-open interval overlap: [a, b) and [c, d). Back-to-back (b === c) is not an overlap. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
