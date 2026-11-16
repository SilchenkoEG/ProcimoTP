import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { type Court, Sport } from './court.entity.js';

// Whole hours only ("08:00" … "23:00"): slots are 1 hour, so opening/closing must be on the hour.
const HOUR = /^([01]\d|2[0-3]):00$/;
const HOUR_MESSAGE = '$property must be a whole hour in HH:00 format, e.g. 08:00';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCourtDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsEnum(Sport)
  sport: Sport;

  @IsInt()
  @Min(1)
  @Max(1_000_000) // €10,000/h — a sanity cap, not a business rule
  priceCents: number;

  @Matches(HOUR, { message: HOUR_MESSAGE })
  opensAt: string;

  @Matches(HOUR, { message: HOUR_MESSAGE })
  closesAt: string;
}

/** Every field optional; `isActive: false` deactivates, `isActive: true` reactivates. */
export class UpdateCourtDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(Sport)
  sport?: Sport;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  priceCents?: number;

  @IsOptional()
  @Matches(HOUR, { message: HOUR_MESSAGE })
  opensAt?: string;

  @IsOptional()
  @Matches(HOUR, { message: HOUR_MESSAGE })
  closesAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCourtQuery {
  /**
   * Second step of the confirm dialog: the admin has seen the 409 listing the upcoming
   * bookings this change would break, and confirms they should be cancelled.
   */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  cancelAffectedBookings?: boolean;
}

export interface CourtResponse {
  id: string;
  name: string;
  sport: Sport;
  priceCents: number;
  opensAt: string; // "08:00"
  closesAt: string; // "23:00"
  isActive: boolean;
}

export function toCourtResponse(court: Court): CourtResponse {
  return {
    id: court.id,
    name: court.name,
    sport: court.sport,
    priceCents: court.priceCents,
    // Postgres returns `time` as "08:00:00"; the API speaks "08:00".
    opensAt: court.opensAt.slice(0, 5),
    closesAt: court.closesAt.slice(0, 5),
    isActive: court.isActive,
  };
}
