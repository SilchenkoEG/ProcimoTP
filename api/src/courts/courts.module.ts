import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/booking.entity.js';
import { AdminCourtsController } from './admin-courts.controller.js';
import { Court } from './court.entity.js';
import { CourtsController } from './courts.controller.js';
import { CourtsService } from './courts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Court, Booking])],
  controllers: [CourtsController, AdminCourtsController],
  providers: [CourtsService],
  exports: [CourtsService],
})
export class CourtsModule {}
