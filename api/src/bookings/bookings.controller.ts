import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { Clock } from '../common/clock.js';
import { UserRole } from '../users/user.entity.js';
import { type BookingResponse, CreateBookingDto, toBookingResponse } from './booking.dto.js';
import { BookingsService } from './bookings.service.js';

/**
 * A user's own bookings. Users book; admins manage courts and see all bookings
 * (admin endpoints) — so these routes are for the `user` role only.
 */
@Roles(UserRole.User)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookings: BookingsService,
    private readonly clock: Clock,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.create(user, {
      courtId: dto.courtId,
      startsAt: new Date(dto.startsAt),
      hours: dto.hours,
    });
    return toBookingResponse(booking, this.clock.now());
  }

  @Get('me')
  async mine(
    @CurrentUser() user: AuthUser,
  ): Promise<{ upcoming: BookingResponse[]; past: BookingResponse[] }> {
    const { upcoming, past } = await this.bookings.listMine(user);
    const now = this.clock.now();
    return {
      upcoming: upcoming.map((b) => toBookingResponse(b, now)),
      past: past.map((b) => toBookingResponse(b, now)),
    };
  }

  /**
   * A POST action rather than DELETE: cancelling is a state change, the booking
   * is kept (history, revenue reports), not removed.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponse> {
    return toBookingResponse(await this.bookings.cancel(user, id), this.clock.now());
  }
}
