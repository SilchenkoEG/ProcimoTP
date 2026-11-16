import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtsModule } from '../courts/courts.module.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { Booking } from './booking.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Booking]), CourtsModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class BookingsModule {}
