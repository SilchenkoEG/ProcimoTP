// Demo data for local runs and reviewers. Run with `npm run seed` (after `npm run build`).
// - Applies pending migrations first, so it works on an empty database.
// - Idempotent: if any user exists, it does nothing (safe on every `docker compose up`).
// - Booking dates are relative to "today" at the facility, so the demo always has
//   past, today's and upcoming bookings no matter when it is run.
import { DataSource, type EntityManager } from 'typeorm';
import { hashPassword } from '../auth/password.js';
import { Booking, BookingStatus, CancelledBy } from '../bookings/booking.entity.js';
import { addDays, facilityDateTime, facilityToday } from '../common/facility-time.js';
import { Court, Sport } from '../courts/court.entity.js';
import { User, UserRole } from '../users/user.entity.js';
import { buildDataSourceOptions, DEFAULT_DATABASE_URL } from './typeorm.config.js';

export const SEED_PASSWORDS = { admin: 'admin123', user: 'user123' } as const;

const USERS = [
  { key: 'admin', email: 'admin@courtly.test', name: 'Facility Admin', role: UserRole.Admin },
  { key: 'alice', email: 'alice@courtly.test', name: 'Alice Martins', role: UserRole.User },
  { key: 'bob', email: 'bob@courtly.test', name: 'Bob Silva', role: UserRole.User },
] as const;

const COURTS = [
  {
    name: 'Padel 1',
    sport: Sport.Padel,
    priceCents: 2400,
    opensAt: '08:00',
    closesAt: '23:00',
    isActive: true,
  },
  {
    name: 'Padel 2',
    sport: Sport.Padel,
    priceCents: 2400,
    opensAt: '08:00',
    closesAt: '23:00',
    isActive: true,
  },
  {
    name: 'Tennis 1',
    sport: Sport.Tennis,
    priceCents: 1800,
    opensAt: '09:00',
    closesAt: '21:00',
    isActive: true,
  },
  {
    name: 'Tennis 2',
    sport: Sport.Tennis,
    priceCents: 1800,
    opensAt: '09:00',
    closesAt: '21:00',
    isActive: true,
  },
  {
    name: 'Squash 1',
    sport: Sport.Squash,
    priceCents: 1200,
    opensAt: '10:00',
    closesAt: '22:00',
    isActive: true,
  },
  // Inactive, but keeps a past booking: shows that deactivation preserves history.
  {
    name: 'Squash 2',
    sport: Sport.Squash,
    priceCents: 1200,
    opensAt: '10:00',
    closesAt: '22:00',
    isActive: false,
  },
] as const;

type CourtName = (typeof COURTS)[number]['name'];
type UserKey = 'alice' | 'bob';

interface SeedBooking {
  user: UserKey;
  court: CourtName;
  dayOffset: number; // relative to facility "today"
  start: string; // facility-local "HH:mm"
  hours: 1 | 2;
  cancelledBy?: CancelledBy;
}

const BOOKINGS: SeedBooking[] = [
  // past
  { user: 'alice', court: 'Squash 2', dayOffset: -10, start: '19:00', hours: 1 },
  { user: 'alice', court: 'Padel 1', dayOffset: -3, start: '18:00', hours: 1 },
  { user: 'bob', court: 'Tennis 1', dayOffset: -2, start: '10:00', hours: 2 },
  {
    user: 'bob',
    court: 'Padel 2',
    dayOffset: -1,
    start: '20:00',
    hours: 1,
    cancelledBy: CancelledBy.User,
  },
  // today
  { user: 'bob', court: 'Squash 1', dayOffset: 0, start: '12:00', hours: 1 },
  { user: 'bob', court: 'Tennis 2', dayOffset: 0, start: '17:00', hours: 1 },
  { user: 'alice', court: 'Padel 1', dayOffset: 0, start: '19:00', hours: 2 },
  // upcoming
  { user: 'alice', court: 'Padel 2', dayOffset: 1, start: '18:00', hours: 1 },
  { user: 'bob', court: 'Padel 1', dayOffset: 1, start: '18:00', hours: 2 },
  {
    user: 'alice',
    court: 'Tennis 1',
    dayOffset: 2,
    start: '10:00',
    hours: 1,
    cancelledBy: CancelledBy.Admin,
  },
];

export async function seed(manager: EntityManager, now: Date = new Date()): Promise<boolean> {
  if ((await manager.count(User)) > 0) return false;

  const [adminHash, userHash] = await Promise.all([
    hashPassword(SEED_PASSWORDS.admin),
    hashPassword(SEED_PASSWORDS.user),
  ]);

  const users = new Map<string, User>();
  for (const u of USERS) {
    const passwordHash = u.role === UserRole.Admin ? adminHash : userHash;
    const saved = await manager.save(
      manager.create(User, { email: u.email, name: u.name, role: u.role, passwordHash }),
    );
    users.set(u.key, saved);
  }

  const courts = new Map<string, Court>();
  for (const c of COURTS) {
    courts.set(c.name, await manager.save(manager.create(Court, { ...c })));
  }

  const today = facilityToday(now);
  for (const b of BOOKINGS) {
    const court = courts.get(b.court)!;
    const startsAt = facilityDateTime(addDays(today, b.dayOffset), b.start);
    const endsAt = new Date(startsAt.getTime() + b.hours * 60 * 60 * 1000);
    await manager.save(
      manager.create(Booking, {
        courtId: court.id,
        userId: users.get(b.user)!.id,
        startsAt,
        endsAt,
        priceCents: court.priceCents * b.hours,
        status: b.cancelledBy ? BookingStatus.Cancelled : BookingStatus.Confirmed,
        cancelledAt: b.cancelledBy ? now : null,
        cancelledBy: b.cancelledBy ?? null,
      }),
    );
  }
  return true;
}

async function main(): Promise<void> {
  const dataSource = new DataSource(
    buildDataSourceOptions(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL),
  );
  await dataSource.initialize(); // migrationsRun: true → schema is up to date after this
  try {
    // One transaction: either all demo data lands, or none of it.
    const seeded = await dataSource.transaction((manager) => seed(manager));
    console.log(seeded ? 'Seed: demo data inserted.' : 'Seed: users already exist, skipped.');
  } finally {
    await dataSource.destroy();
  }
}

// Run only when executed directly (`node dist/database/seed.js`), not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
