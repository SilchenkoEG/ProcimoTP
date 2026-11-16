import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Local dev default: the compose `db` service published on host port 5433.
// Inside docker compose the api gets DATABASE_URL pointing at `db:5432` instead.
export const DEFAULT_DATABASE_URL = 'postgres://courtly:courtly@localhost:5433/courtly';

export function buildTypeOrmOptions(databaseUrl: string): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    autoLoadEntities: true,
    // Schema changes only ever happen through migrations, never auto-sync.
    synchronize: false,
  };
}
