import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import type { JwtPayload } from '../src/auth/auth-user.js';
import { Clock } from '../src/common/clock.js';
import { Court, Sport } from '../src/courts/court.entity.js';
import { User, UserRole } from '../src/users/user.entity.js';
import { TEST_DATABASE_URL } from './test-env.js';

/** A clock the test controls: business rules see `now` as whatever the test sets. */
export class FixedClock extends Clock {
  constructor(private current: Date) {
    super();
  }
  now(): Date {
    return new Date(this.current);
  }
  set(iso: string): void {
    this.current = new Date(iso);
  }
}

export interface TestContext {
  app: INestApplication;
  http: ReturnType<typeof request>;
  dataSource: DataSource;
  clock: FixedClock;
  close: () => Promise<void>;
}

/** The real AppModule (guards, pipes, filter, migrations) on the test DB with a fixed clock. */
export async function createTestApp(nowIso: string): Promise<TestContext> {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const clock = new FixedClock(new Date(nowIso));
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return {
    app,
    http: request(app.getHttpServer()),
    dataSource: app.get(DataSource),
    clock,
    close: () => app.close(),
  };
}

export interface Fixtures {
  admin: User;
  alice: User;
  bob: User;
  padel: Court; // 08:00–23:00, €24/h
  tennis: Court; // 09:00–21:00, €18/h
  tokens: { admin: string; alice: string; bob: string };
}

/** Empty all tables and insert a small, known world. Called before every test. */
export async function resetWithFixtures(ctx: TestContext): Promise<Fixtures> {
  const ds = ctx.dataSource;
  await ds.query('TRUNCATE bookings, courts, users');

  // Tests sign tokens directly, so the hash is never checked here.
  const mkUser = (email: string, name: string, role: UserRole) =>
    ds.getRepository(User).save({ email, name, role, passwordHash: 'unused' });
  const admin = await mkUser('admin@test.local', 'Admin', UserRole.Admin);
  const alice = await mkUser('alice@test.local', 'Alice', UserRole.User);
  const bob = await mkUser('bob@test.local', 'Bob', UserRole.User);

  const courts = ds.getRepository(Court);
  const padel = await courts.save({
    name: 'Padel 1',
    sport: Sport.Padel,
    priceCents: 2400,
    opensAt: '08:00',
    closesAt: '23:00',
    isActive: true,
  });
  const tennis = await courts.save({
    name: 'Tennis 1',
    sport: Sport.Tennis,
    priceCents: 1800,
    opensAt: '09:00',
    closesAt: '21:00',
    isActive: true,
  });

  const jwt = ctx.app.get(JwtService);
  const sign = (u: User) => jwt.sign({ sub: u.id, role: u.role } satisfies JwtPayload);
  return {
    admin,
    alice,
    bob,
    padel,
    tennis,
    tokens: { admin: sign(admin), alice: sign(alice), bob: sign(bob) },
  };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
