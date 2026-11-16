import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtsModule } from '../courts/courts.module.js';
import { AdminBookingsController } from './admin-bookings.controller.js';
import { AdminBookingsService } from './admin-bookings.service.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { Booking } from './booking.entity.js';
import { BookingsController } from './bookings.controller.js';
import { BookingsService } from './bookings.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), CourtsModule],
  controllers: [AvailabilityController, BookingsController, AdminBookingsController],
  providers: [AvailabilityService, BookingsService, AdminBookingsService],
})
export class BookingsModule {}
