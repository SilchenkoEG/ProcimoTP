import type { Slot } from '../../api/types';

/** A 2-hour booking needs the following slot to exist (before closing) and be free too. */
export function canBookTwoHours(slots: Slot[], startIndex: number): boolean {
  return slots[startIndex]?.status === 'available' && slots[startIndex + 1]?.status === 'available';
}

/** Index range [start, start + hours) of the slots covered by the current selection. */
export function isSlotSelected(
  slots: Slot[],
  index: number,
  selectedStart: string | null,
  hours: 1 | 2,
): boolean {
  if (!selectedStart) return false;
  const start = slots.findIndex((s) => s.startsAt === selectedStart);
  return start !== -1 && index >= start && index < start + hours;
}
