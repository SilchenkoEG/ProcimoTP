import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { AuthUser } from '../auth/auth-user.js';
import { Clock } from '../common/clock.js';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import { Court } from '../courts/court.entity.js';
import { courtNotFound } from '../courts/courts.service.js';
import { isPgError, PG_EXCLUSION_VIOLATION } from '../database/pg-errors.js';
import {
  CANCELLATION_WINDOW_HOURS,
  canCancel,
  endOf,
  isInPast,
  isOnTheHour,
  isWithinOpeningHours,
} from './booking-rules.js';
import { Booking, BookingStatus, CancelledBy } from './booking.entity.js';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  /**
   * Book a court for 1 or 2 consecutive hours.
   *
   * The checks here give clear errors for the common cases, but the real guarantee
   * against double booking is the `bookings_no_overlap` exclusion constraint: when two
   * requests race for the same slot, Postgres lets exactly one INSERT commit and the
   * other fails with 23P01, which we return as 409 SLOT_TAKEN.
   * `bookings_no_back_to_back_same_user` stops one user chaining bookings on a court
   * (409 BACK_TO_BACK_BOOKING), so nobody plays more than 2 hours in a row.
   */
  async create(
    user: AuthUser,
    input: { courtId: string; startsAt: Date; hours: number },
  ): Promise<Booking> {
    const now = this.clock.now();
    const { startsAt, hours } = input;
    const endsAt = endOf(startsAt, hours);

    if (!isOnTheHour(startsAt)) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.InvalidStart,
        'Bookings must start on the hour (e.g. 10:00)',
      );
    }
    if (isInPast(startsAt, now)) {
      throw new AppException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        ErrorCode.BookingInPast,
        'Bookings cannot be made in the past',
      );
    }

    try {
      const id = await this.dataSource.transaction(async (manager) => {
        // FOR SHARE: blocks a concurrent admin edit/deactivation of this court (which takes
        // FOR UPDATE) until we commit, so we never book against hours that just changed.
        const court = await manager.findOne(Court, {
          where: { id: input.courtId },
          lock: { mode: 'pessimistic_read' },
        });
        if (!court) {
          throw courtNotFound();
        }
        if (!court.isActive) {
          throw new AppException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            ErrorCode.CourtInactive,
            'This court is not available for booking',
          );
        }
        if (!isWithinOpeningHours(court, startsAt, endsAt)) {
          throw new AppException(
            HttpStatus.UNPROCESSABLE_ENTITY,
            ErrorCode.OutsideOpeningHours,
            `This court is open ${court.opensAt}–${court.closesAt}`,
          );
        }

        const booking = manager.create(Booking, {
          courtId: court.id,
          userId: user.id,
          startsAt,
          endsAt,
          // Price snapshot: what the user agreed to pay, unaffected by later price edits.
          priceCents: court.priceCents * hours,
          status: BookingStatus.Confirmed,
        });
        return (await manager.save(booking)).id;
      });
      return this.findWithCourt(id);
    } catch (error) {
      if (isPgError(error, PG_EXCLUSION_VIOLATION, 'bookings_no_overlap')) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.SlotTaken,
          'This time slot has just been booked by someone else',
        );
      }
      if (isPgError(error, PG_EXCLUSION_VIOLATION, 'bookings_no_back_to_back_same_user')) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.BackToBackBooking,
          'You already have a booking on this court right before or after this time. You can play at most 2 hours in a row',
        );
      }
      throw error;
    }
  }

  /** The caller's bookings (confirmed and cancelled), split by whether they have ended. */
  async listMine(user: AuthUser): Promise<{ upcoming: Booking[]; past: Booking[] }> {
    const now = this.clock.now();
    const all = await this.bookings.find({
      where: { userId: user.id },
      relations: { court: true },
      order: { startsAt: 'ASC' },
    });
    return {
      upcoming: all.filter((b) => b.endsAt > now),
      past: all.filter((b) => b.endsAt <= now).reverse(), // most recent first
    };
  }

  /** Cancel your own booking, up to 2 hours before it starts. Soft: the row stays. */
  async cancel(user: AuthUser, bookingId: string): Promise<Booking> {
    await this.dataSource.transaction(async (manager) => {
      // FOR UPDATE: two cancel clicks (or cancel + admin action) can't interleave.
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!booking) {
        throw new AppException(
          HttpStatus.NOT_FOUND,
          ErrorCode.BookingNotFound,
          'Booking not found',
        );
      }
      if (booking.userId !== user.id) {
        throw new AppException(
          HttpStatus.FORBIDDEN,
          ErrorCode.Forbidden,
          'You can only cancel your own bookings',
        );
      }
      if (booking.status === BookingStatus.Cancelled) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.BookingAlreadyCancelled,
          'This booking is already cancelled',
        );
      }
      const now = this.clock.now();
      if (!canCancel(booking.startsAt, now)) {
        throw new AppException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          ErrorCode.CancellationWindowClosed,
          `Bookings can only be cancelled up to ${CANCELLATION_WINDOW_HOURS} hours before they start`,
        );
      }

      booking.status = BookingStatus.Cancelled;
      booking.cancelledAt = now;
      booking.cancelledBy = CancelledBy.User;
      await manager.save(booking);
    });
    return this.findWithCourt(bookingId);
  }

  private findWithCourt(id: string): Promise<Booking> {
    return this.bookings.findOneOrFail({ where: { id }, relations: { court: true } });
  }
}
