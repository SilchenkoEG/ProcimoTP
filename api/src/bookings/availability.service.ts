import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clock } from '../common/clock.js';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import { FACILITY_TIMEZONE, isValidDate } from '../common/facility-time.js';
import { toCourtResponse } from '../courts/court.dto.js';
import { CourtsService } from '../courts/courts.service.js';
import { Booking, BookingStatus } from './booking.entity.js';
import { buildDaySlots, overlaps } from './slots.js';

export type SlotStatus = 'available' | 'taken' | 'past';

export interface AvailabilityResponse {
  courtId: string;
  date: string;
  timezone: string;
  opensAt: string;
  closesAt: string;
  priceCents: number;
  slots: { time: string; startsAt: string; endsAt: string; status: SlotStatus }[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly courts: CourtsService,
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    private readonly clock: Clock,
  ) {}

  /**
   * The day's 1-hour slots for a court: within opening hours only, each marked
   * `taken` (overlaps a confirmed booking), `past` (already started) or `available`.
   * This is a read for the UI — the booking itself is protected by the DB constraint.
   */
  async forDay(courtId: string, date: string): Promise<AvailabilityResponse> {
    if (!isValidDate(date)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationFailed,
        'Request validation failed',
        { date: ['date must be a valid calendar date in YYYY-MM-DD format'] },
      );
    }
    const court = toCourtResponse(await this.courts.getActive(courtId));
    const slots = buildDaySlots(date, court.opensAt, court.closesAt);
    if (slots.length === 0) return { ...this.header(court, date), slots: [] };

    const dayStart = slots[0].startsAt;
    const dayEnd = slots[slots.length - 1].endsAt;
    // Confirmed bookings overlapping opening hours — served by the GiST index (court_id, range).
    const booked = await this.bookings
      .createQueryBuilder('b')
      .select(['b.startsAt', 'b.endsAt'])
      .where('b.courtId = :courtId', { courtId })
      .andWhere('b.status = :status', { status: BookingStatus.Confirmed })
      .andWhere('b.startsAt < :dayEnd AND b.endsAt > :dayStart', { dayStart, dayEnd })
      .getMany();

    const now = this.clock.now();
    return {
      ...this.header(court, date),
      slots: slots.map((slot) => ({
        time: slot.time,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        status: booked.some((b) => overlaps(slot.startsAt, slot.endsAt, b.startsAt, b.endsAt))
          ? 'taken'
          : slot.startsAt <= now
            ? 'past'
            : 'available',
      })),
    };
  }

  private header(court: ReturnType<typeof toCourtResponse>, date: string) {
    return {
      courtId: court.id,
      date,
      timezone: FACILITY_TIMEZONE,
      opensAt: court.opensAt,
      closesAt: court.closesAt,
      priceCents: court.priceCents,
    };
  }
}
