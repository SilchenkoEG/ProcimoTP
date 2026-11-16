import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays, FACILITY_TIMEZONE, facilityDateTime } from '../common/facility-time.js';
import type { Sport } from '../courts/court.entity.js';
import { Booking, BookingStatus, type CancelledBy } from './booking.entity.js';

export interface AdminDayBooking {
  id: string;
  court: { id: string; name: string; sport: Sport };
  user: { id: string; name: string; email: string };
  startsAt: string;
  endsAt: string;
  hours: number;
  priceCents: number;
  status: BookingStatus;
  cancelledBy: CancelledBy | null;
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

function toAdminDayBooking(b: Booking): AdminDayBooking {
  const court = b.court!;
  const user = b.user!;
  return {
    id: b.id,
    court: { id: court.id, name: court.name, sport: court.sport },
    user: { id: user.id, name: user.name, email: user.email },
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    hours: (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000,
    priceCents: b.priceCents,
    status: b.status,
    cancelledBy: b.cancelledBy,
  };
}
