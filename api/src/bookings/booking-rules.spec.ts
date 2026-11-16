import { canCancel, endOf, isInPast, isOnTheHour, isWithinOpeningHours } from './booking-rules.js';

const at = (iso: string) => new Date(iso);
const court = { opensAt: '08:00', closesAt: '23:00' };

describe('booking rules', () => {
  describe('isOnTheHour', () => {
    it('accepts whole hours', () => {
      expect(isOnTheHour(at('2030-01-10T10:00:00Z'))).toBe(true);
    });
    it.each(['2030-01-10T10:30:00Z', '2030-01-10T10:00:05Z', '2030-01-10T10:00:00.001Z'])(
      'rejects %s',
      (iso) => expect(isOnTheHour(at(iso))).toBe(false),
    );
  });

  describe('isInPast', () => {
    const now = at('2030-01-10T10:00:00Z');
    it('rejects a slot that already started (start == now)', () => {
      expect(isInPast(at('2030-01-10T10:00:00Z'), now)).toBe(true);
    });
    it('rejects an earlier slot', () => {
      expect(isInPast(at('2030-01-10T09:00:00Z'), now)).toBe(true);
    });
    it('allows a future slot', () => {
      expect(isInPast(at('2030-01-10T11:00:00Z'), now)).toBe(false);
    });
  });

  describe('isWithinOpeningHours (court open 08:00–23:00 Lisbon time)', () => {
    const fits = (startIso: string, hours: number) =>
      isWithinOpeningHours(court, at(startIso), endOf(at(startIso), hours));

    // January: Lisbon is UTC+0, so local time == UTC.
    it('allows the first slot of the day (starts exactly at opening)', () => {
      expect(fits('2030-01-10T08:00:00Z', 1)).toBe(true);
    });
    it('allows a booking that ends exactly at closing', () => {
      expect(fits('2030-01-10T21:00:00Z', 2)).toBe(true);
    });
    it('rejects a booking that starts before opening', () => {
      expect(fits('2030-01-10T07:00:00Z', 1)).toBe(false);
    });
    it('rejects a 2 h booking that runs past closing', () => {
      expect(fits('2030-01-10T22:00:00Z', 2)).toBe(false);
    });
    it('rejects a booking that starts at closing time', () => {
      expect(fits('2030-01-10T23:00:00Z', 1)).toBe(false);
    });

    // July: Lisbon is UTC+1, so 08:00 local is 07:00 UTC. Hours are checked in local time.
    it('uses facility-local time in summer (08:00 Lisbon = 07:00Z)', () => {
      expect(fits('2030-07-10T07:00:00Z', 1)).toBe(true);
      expect(fits('2030-07-10T06:00:00Z', 1)).toBe(false); // 07:00 local, before opening
      expect(fits('2030-07-10T21:00:00Z', 1)).toBe(true); // 22:00–23:00 local
      expect(fits('2030-07-10T22:00:00Z', 1)).toBe(false); // 23:00–00:00 local
    });
  });

  describe('canCancel (allowed up to 2 hours before start)', () => {
    const start = at('2030-01-10T12:00:00Z');
    it('allows cancelling well in advance', () => {
      expect(canCancel(start, at('2030-01-09T12:00:00Z'))).toBe(true);
    });
    it('allows cancelling exactly 2 hours before', () => {
      expect(canCancel(start, at('2030-01-10T10:00:00Z'))).toBe(true);
    });
    it('rejects 1 ms inside the 2 hour window', () => {
      expect(canCancel(start, at('2030-01-10T10:00:00.001Z'))).toBe(false);
    });
    it('rejects after the booking started', () => {
      expect(canCancel(start, at('2030-01-10T12:30:00Z'))).toBe(false);
    });
  });
});
