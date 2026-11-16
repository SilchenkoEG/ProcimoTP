import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { type AvailabilityResponse, AvailabilityService } from './availability.service.js';

class AvailabilityQuery {
  /** Facility-local calendar date, YYYY-MM-DD (format checked in the service). */
  @IsString()
  date: string;
}

/** Any signed-in user. Lives with bookings because "taken" is derived from bookings. */
@Controller('courts')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(':id/availability')
  get(
    @Param('id', ParseUUIDPipe) courtId: string,
    @Query() query: AvailabilityQuery,
  ): Promise<AvailabilityResponse> {
    return this.availability.forDay(courtId, query.date);
  }
}
