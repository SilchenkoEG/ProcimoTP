import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { type CourtResponse, toCourtResponse } from './court.dto.js';
import { CourtsService } from './courts.service.js';

/** Any signed-in user: browse the courts that can be booked. */
@Controller('courts')
export class CourtsController {
  constructor(private readonly courts: CourtsService) {}

  @Get()
  async list(): Promise<CourtResponse[]> {
    return (await this.courts.listActive()).map(toCourtResponse);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<CourtResponse> {
    return toCourtResponse(await this.courts.getActive(id));
  }
}
