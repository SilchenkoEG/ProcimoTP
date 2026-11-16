import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { DateQuery } from '../common/validation.js';
import { UserRole } from '../users/user.entity.js';
import { type AdminDayView, AdminBookingsService } from './admin-bookings.service.js';

/** Admin only: every booking on a day across all courts, with expected revenue. */
@Roles(UserRole.Admin)
@Controller('admin/bookings')
export class AdminBookingsController {
  constructor(private readonly adminBookings: AdminBookingsService) {}

  @Get()
  dayView(@Query() query: DateQuery): Promise<AdminDayView> {
    return this.adminBookings.dayView(query.date);
  }
}
