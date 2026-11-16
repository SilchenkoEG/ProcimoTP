import { IsIn, IsISO8601, IsUUID, Matches } from 'class-validator';
import type { Sport } from '../courts/court.entity.js';
import { ALLOWED_DURATIONS_HOURS, canCancel, HOUR_MS } from './booking-rules.js';
import { type Booking, BookingStatus, type CancelledBy } from './booking.entity.js';

export class CreateBookingDto {
  @IsUUID()
  courtId: string;

  /**
   * The slot's exact start instant, as returned by the availability endpoint
   * (e.g. "2030-01-10T10:00:00.000Z"). An explicit offset is required: a bare
   * "2030-01-10T10:00" would be read in the *server's* time zone — ambiguous.
   */
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'startsAt must include a UTC offset, e.g. Z' })
  startsAt: string;

  @IsIn(ALLOWED_DURATIONS_HOURS, { message: 'hours must be 1 or 2' })
  hours: number;
}

/** The fields every booking response shares (user's own bookings and the admin day view). */
export interface BookingSummary {
  id: string;
  court: { id: string; name: string; sport: Sport };
  startsAt: string;
  endsAt: string;
  hours: number;
  priceCents: number;
  status: BookingStatus;
  cancelledBy: CancelledBy | null;
}

export interface BookingResponse extends BookingSummary {
  cancelledAt: string | null;
  /** UI hint only (the API re-checks on cancel): still outside the 2 h window and confirmed. */
  canCancel: boolean;
}

/** `booking.court` must be loaded. */
export function toBookingSummary(booking: Booking): BookingSummary {
  const court = booking.court!;
  return {
    id: booking.id,
    court: { id: court.id, name: court.name, sport: court.sport },
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    hours: (booking.endsAt.getTime() - booking.startsAt.getTime()) / HOUR_MS,
    priceCents: booking.priceCents,
    status: booking.status,
    cancelledBy: booking.cancelledBy,
  };
}

/** `booking.court` must be loaded. */
export function toBookingResponse(booking: Booking, now: Date): BookingResponse {
  return {
    ...toBookingSummary(booking),
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    canCancel: booking.status === BookingStatus.Confirmed && canCancel(booking.startsAt, now),
  };
}
