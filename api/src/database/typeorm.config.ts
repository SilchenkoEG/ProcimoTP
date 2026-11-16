import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Booking } from '../bookings/booking.entity.js';
import { Court } from '../courts/court.entity.js';
import { User } from '../users/user.entity.js';
import { InitialSchema1794835933000 } from './migrations/1794835933000-InitialSchema.js';

// Local dev default: the compose `db` service published on host port 5433.
// Inside docker compose the api gets DATABASE_URL pointing at `db:5432` instead.
export const DEFAULT_DATABASE_URL = 'postgres://courtly:courtly@localhost:5433/courtly';

export function buildTypeOrmOptions(databaseUrl: string): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    // Listed explicitly (no globs): clear, and works the same from src/ and dist/.
    entities: [User, Court, Booking],
    migrations: [InitialSchema1794835933000],
    // Schema changes only ever happen through migrations, never auto-sync.
    synchronize: false,
    // Pending migrations are applied on startup, each in its own transaction.
    migrationsRun: true,
    migrationsTransactionMode: 'each',
  };
}
