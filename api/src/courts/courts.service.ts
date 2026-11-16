import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In, Repository } from 'typeorm';
import { Booking, BookingStatus, CancelledBy } from '../bookings/booking.entity.js';
import { Clock } from '../common/clock.js';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import { FACILITY_TIMEZONE } from '../common/facility-time.js';
import { isPgError, PG_UNIQUE_VIOLATION } from '../database/pg-errors.js';
import { Court } from './court.entity.js';
import type { CreateCourtDto, UpdateCourtDto } from './court.dto.js';

@Injectable()
export class CourtsService {
  constructor(
    @InjectRepository(Court) private readonly courts: Repository<Court>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  /** Courts users can book. */
  listActive(): Promise<Court[]> {
    return this.courts.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  /** Admin view: every court, including deactivated ones. */
  listAll(): Promise<Court[]> {
    return this.courts.find({ order: { name: 'ASC' } });
  }

  /** A court a user may book; inactive courts are hidden from users (404). */
  async getActive(id: string): Promise<Court> {
    const court = await this.courts.findOneBy({ id, isActive: true });
    if (!court) throw courtNotFound();
    return court;
  }

  async create(dto: CreateCourtDto): Promise<Court> {
    assertHoursOrder(dto.opensAt, dto.closesAt);
    try {
      const { name, sport, priceCents, opensAt, closesAt } = dto;
      return await this.courts.save(
        this.courts.create({ name, sport, priceCents, opensAt, closesAt, isActive: true }),
      );
    } catch (error) {
      throw mapNameTaken(error);
    }
  }

  /**
   * Edit and/or (de)activate a court.
   *
   * If the change would break upcoming confirmed bookings (deactivating, or new hours that
   * no longer cover them), it is refused with 409 COURT_HAS_UPCOMING_BOOKINGS and the count.
   * Repeating the call with cancelAffectedBookings=true applies the change AND cancels those
   * bookings in one transaction (cancelled_by = 'admin') — all or nothing.
   */
  async update(id: string, dto: UpdateCourtDto, cancelAffectedBookings: boolean): Promise<Court> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Row lock: serialises concurrent edits of the same court, and (step 8) bookings
        // read the court with FOR SHARE, so none can slip in between our check and our write.
        const court = await manager.findOne(Court, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!court) throw courtNotFound();

        // Only fields actually sent count as changes. (A validated DTO instance has every
        // declared property, unsent ones as `undefined`, so it must not be spread blindly.)
        const changes = definedOnly(dto);
        const opensAt = (changes.opensAt ?? court.opensAt).slice(0, 5);
        const closesAt = (changes.closesAt ?? court.closesAt).slice(0, 5);
        assertHoursOrder(opensAt, closesAt);

        const affected = await this.findAffectedBookings(manager, court, {
          deactivating: court.isActive && changes.isActive === false,
          hoursChanged:
            opensAt !== court.opensAt.slice(0, 5) || closesAt !== court.closesAt.slice(0, 5),
          opensAt,
          closesAt,
        });

        if (affected.length > 0 && !cancelAffectedBookings) {
          throw new AppException(
            HttpStatus.CONFLICT,
            ErrorCode.CourtHasUpcomingBookings,
            `${affected.length} upcoming booking(s) would be affected by this change. ` +
              'Confirm to apply it and cancel them.',
            { affectedBookings: affected.length },
          );
        }
        if (affected.length > 0) {
          await manager.update(
            Booking,
            { id: In(affected.map((b) => b.id)) },
            {
              status: BookingStatus.Cancelled,
              cancelledAt: this.clock.now(),
              cancelledBy: CancelledBy.Admin,
            },
          );
        }

        Object.assign(court, changes);
        return manager.save(court);
      });
    } catch (error) {
      throw mapNameTaken(error);
    }
  }

  /**
   * Upcoming (not yet started) confirmed bookings that the change would break:
   * all of them when deactivating; when hours change, those no longer inside the new hours.
   */
  private async findAffectedBookings(
    manager: EntityManager,
    court: Court,
    change: { deactivating: boolean; hoursChanged: boolean; opensAt: string; closesAt: string },
  ): Promise<Pick<Booking, 'id'>[]> {
    if (!change.deactivating && !change.hoursChanged) return [];

    const query = manager
      .createQueryBuilder(Booking, 'b')
      .select('b.id')
      .where('b.courtId = :courtId', { courtId: court.id })
      .andWhere('b.status = :status', { status: BookingStatus.Confirmed })
      .andWhere('b.startsAt > :now', { now: this.clock.now() });

    if (!change.deactivating) {
      // Compare in facility-local wall-clock time, the same frame as opening hours.
      query.andWhere(
        '((b.starts_at AT TIME ZONE :tz)::time < :opensAt OR (b.ends_at AT TIME ZONE :tz)::time > :closesAt)',
        { tz: FACILITY_TIMEZONE, opensAt: change.opensAt, closesAt: change.closesAt },
      );
    }
    return query.getMany();
  }
}

function definedOnly(dto: UpdateCourtDto): Partial<UpdateCourtDto> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  ) as Partial<UpdateCourtDto>;
}

function courtNotFound(): AppException {
  return new AppException(HttpStatus.NOT_FOUND, ErrorCode.CourtNotFound, 'Court not found');
}

function assertHoursOrder(opensAt: string, closesAt: string): void {
  // "HH:mm" strings compare correctly as text.
  if (closesAt <= opensAt) {
    throw new AppException(
      HttpStatus.BAD_REQUEST,
      ErrorCode.ValidationFailed,
      'Request validation failed',
      { closesAt: ['closesAt must be later than opensAt'] },
    );
  }
}

function mapNameTaken(error: unknown): unknown {
  if (isPgError(error, PG_UNIQUE_VIOLATION, 'courts_name_key')) {
    return new AppException(
      HttpStatus.CONFLICT,
      ErrorCode.CourtNameTaken,
      'A court with this name already exists',
    );
  }
  return error;
}
