import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays, FACILITY_TIMEZONE, facilityDateTime } from '../common/facility-time.js';
import { type BookingSummary, toBookingSummary } from './booking.dto.js';
import { Booking, BookingStatus } from './booking.entity.js';

export interface AdminDayBooking extends BookingSummary {
  user: { id: string; name: string; email: string };
}

export interface AdminDayView {
  date: string;
  timezone: string;
  /** Sum of the price snapshots of the day's confirmed bookings; cancelled ones don't count. */
  totalRevenueCents: number;
  confirmedCount: number;
  cancelledCount: number;
  /** All the day's bookings across all courts (active or not), cancelled ones included. */
  bookings: AdminDayBooking[];
}

@Injectable()
export class AdminBookingsService {
  constructor(@InjectRepository(Booking) private readonly bookings: Repository<Booking>) {}

  async dayView(date: string): Promise<AdminDayView> {
    // The facility-local day [00:00, next day 00:00) — 23 or 25 hours long on DST change days.
    const dayStart = facilityDateTime(date, '00:00');
    const dayEnd = facilityDateTime(addDays(date, 1), '00:00');

    // A booking belongs to the day it starts on. Served by bookings_starts_at_idx.
    const rows = await this.bookings
      .createQueryBuilder('b')
      .innerJoinAndSelect('b.court', 'court')
      .innerJoinAndSelect('b.user', 'user')
      .where('b.startsAt >= :dayStart AND b.startsAt < :dayEnd', { dayStart, dayEnd })
      .orderBy('b.startsAt', 'ASC')
      .addOrderBy('court.name', 'ASC')
      .getMany();

    const confirmed = rows.filter((b) => b.status === BookingStatus.Confirmed);
    return {
      date,
      timezone: FACILITY_TIMEZONE,
      totalRevenueCents: confirmed.reduce((sum, b) => sum + b.priceCents, 0),
      confirmedCount: confirmed.length,
      cancelledCount: rows.length - confirmed.length,
      bookings: rows.map(toAdminDayBooking),
    };
  }
}

/** `b.court` and `b.user` must be loaded. */
function toAdminDayBooking(b: Booking): AdminDayBooking {
  const user = b.user!;
  return { ...toBookingSummary(b), user: { id: user.id, name: user.name, email: user.email } };
}
