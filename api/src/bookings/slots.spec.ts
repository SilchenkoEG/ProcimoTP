import { buildDaySlots, overlaps } from './slots.js';

const at = (iso: string) => new Date(iso);

describe('buildDaySlots', () => {
  it('builds one slot per hour from opening to closing', () => {
    const slots = buildDaySlots('2030-01-10', '08:00', '11:00');
    expect(slots.map((s) => s.time)).toEqual(['08:00', '09:00', '10:00']);
    expect(slots[0].startsAt.toISOString()).toBe('2030-01-10T08:00:00.000Z');
    expect(slots[2].endsAt.toISOString()).toBe('2030-01-10T11:00:00.000Z');
  });

  it('gives 15 slots for a court open 08:00–23:00', () => {
    expect(buildDaySlots('2030-01-10', '08:00', '23:00')).toHaveLength(15);
  });

  it('maps local hours to the right instants in summer (Lisbon UTC+1)', () => {
    const [first] = buildDaySlots('2030-07-10', '08:00', '09:00');
    expect(first.startsAt.toISOString()).toBe('2030-07-10T07:00:00.000Z');
  });

  it('stays correct on the spring-forward day (2030-03-31, 01:00 → 02:00 in Lisbon)', () => {
    const slots = buildDaySlots('2030-03-31', '08:00', '10:00');
    expect(slots.map((s) => s.startsAt.toISOString())).toEqual([
      '2030-03-31T07:00:00.000Z',
      '2030-03-31T08:00:00.000Z',
    ]);
  });
});

describe('overlaps (half-open [start, end) intervals)', () => {
  const a = [at('2030-01-10T10:00:00Z'), at('2030-01-10T11:00:00Z')] as const;

  it('detects the same slot', () => {
    expect(overlaps(...a, ...a)).toBe(true);
  });
  it('detects a 2 h booking covering the slot', () => {
    expect(overlaps(...a, at('2030-01-10T09:00:00Z'), at('2030-01-10T11:00:00Z'))).toBe(true);
  });
  it('treats back-to-back bookings as not overlapping', () => {
    expect(overlaps(...a, at('2030-01-10T11:00:00Z'), at('2030-01-10T12:00:00Z'))).toBe(false);
    expect(overlaps(...a, at('2030-01-10T09:00:00Z'), at('2030-01-10T10:00:00Z'))).toBe(false);
  });
});
