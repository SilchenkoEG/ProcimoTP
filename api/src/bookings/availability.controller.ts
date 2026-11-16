import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { DateQuery } from '../common/validation.js';
import { type AvailabilityResponse, AvailabilityService } from './availability.service.js';

/** Any signed-in user. Lives with bookings because "taken" is derived from bookings. */
@Controller('courts')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(':id/availability')
  get(
    @Param('id', ParseUUIDPipe) courtId: string,
    @Query() query: DateQuery,
  ): Promise<AvailabilityResponse> {
    return this.availability.forDay(courtId, query.date);
  }
}
