import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { UserRole } from '../users/user.entity.js';
import {
  type CourtResponse,
  CreateCourtDto,
  toCourtResponse,
  UpdateCourtDto,
  UpdateCourtQuery,
} from './court.dto.js';
import { CourtsService } from './courts.service.js';

/** Court management. @Roles on the class: every route here is admin-only (403 otherwise). */
@Roles(UserRole.Admin)
@Controller('admin/courts')
export class AdminCourtsController {
  constructor(private readonly courts: CourtsService) {}

  @Get()
  async list(): Promise<CourtResponse[]> {
    return (await this.courts.listAll()).map(toCourtResponse);
  }

  @Post()
  async create(@Body() dto: CreateCourtDto): Promise<CourtResponse> {
    return toCourtResponse(await this.courts.create(dto));
  }

  /** Edit fields, deactivate (`isActive: false`) or reactivate (`isActive: true`). Never deletes. */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourtDto,
    @Query() query: UpdateCourtQuery,
  ): Promise<CourtResponse> {
    return toCourtResponse(
      await this.courts.update(id, dto, query.cancelAffectedBookings ?? false),
    );
  }
}
