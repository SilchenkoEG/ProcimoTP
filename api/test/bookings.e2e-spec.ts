import { Booking, BookingStatus } from '../src/bookings/booking.entity.js';
import { Court } from '../src/courts/court.entity.js';
import {
  auth,
  createTestApp,
  type Fixtures,
  resetWithFixtures,
  type TestContext,
} from './helpers.js';

// "Now" for every test: 2030-01-10 09:00 UTC. In January Lisbon time == UTC.
const NOW = '2030-01-10T09:00:00Z';

describe('Bookings (integration, real Postgres)', () => {
  let ctx: TestContext;
  let f: Fixtures;

  beforeAll(async () => {
    ctx = await createTestApp(NOW);
  });
  afterAll(async () => {
    await ctx.close();
  });
  beforeEach(async () => {
    ctx.clock.set(NOW);
    f = await resetWithFixtures(ctx);
  });

  const book = (token: string, courtId: string, startsAt: string, hours = 1) =>
    ctx.http.post('/api/bookings').set(auth(token)).send({ courtId, startsAt, hours });

  const confirmedCount = () =>
    ctx.dataSource
      .getRepository(Booking)
      .countBy({ courtId: f.padel.id, status: BookingStatus.Confirmed });

  describe('double-booking prevention', () => {
    it('lets exactly one of many simultaneous requests for the same slot succeed', async () => {
      const attempts = 10;
      const responses = await Promise.all(
        Array.from({ length: attempts }, (_, i) =>
          book(i % 2 ? f.tokens.alice : f.tokens.bob, f.padel.id, '2030-01-11T18:00:00Z'),
        ),
      );

      const statuses = responses.map((r) => r.status);
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(attempts - 1);
      for (const r of responses.filter((r) => r.status === 409)) {
        expect(r.body.error.code).toBe('SLOT_TAKEN');
      }
      expect(await confirmedCount()).toBe(1);
    });

    it('rejects a 2 h booking that overlaps an existing 1 h booking', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z').expect(201);
      const res = await book(f.tokens.alice, f.padel.id, '2030-01-11T09:00:00Z', 2).expect(409);
      expect(res.body.error.code).toBe('SLOT_TAKEN');
    });

    it('allows back-to-back bookings (11:00–12:00 after 10:00–11:00)', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z').expect(201);
      await book(f.tokens.alice, f.padel.id, '2030-01-11T11:00:00Z').expect(201);
    });

    it('allows the same slot on a different court', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z').expect(201);
      await book(f.tokens.alice, f.tennis.id, '2030-01-11T10:00:00Z').expect(201);
    });

    it('frees a slot once its booking is cancelled', async () => {
      const first = await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z').expect(201);
      await ctx.http
        .post(`/api/bookings/${first.body.id}/cancel`)
        .set(auth(f.tokens.bob))
        .expect(200);
      await book(f.tokens.alice, f.padel.id, '2030-01-11T10:00:00Z').expect(201);
    });

    it('is enforced by the database itself, even when the service is bypassed', async () => {
      const repo = ctx.dataSource.getRepository(Booking);
      // A fresh object per insert: TypeORM writes the generated id back onto the one passed in.
      const row = (userId: string) => ({
        courtId: f.padel.id,
        userId,
        startsAt: new Date('2030-01-11T10:00:00Z'),
        endsAt: new Date('2030-01-11T11:00:00Z'),
        priceCents: 2400,
      });
      await repo.insert(row(f.bob.id));
      await expect(repo.insert(row(f.alice.id))).rejects.toMatchObject({
        driverError: { code: '23P01', constraint: 'bookings_no_overlap' },
      });
    });
  });

  describe('no back-to-back bookings by the same user on the same court', () => {
    const expectBackToBack = (res: { body: { error: { code: string } } }) =>
      expect(res.body.error.code).toBe('BACK_TO_BACK_BOOKING');

    it('rejects a booking that starts when my own booking ends (17–19 + 19–21)', async () => {
      await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2).expect(201);
      expectBackToBack(
        await book(f.tokens.alice, f.padel.id, '2030-01-11T19:00:00Z', 2).expect(409),
      );
    });

    it('rejects a booking that ends when my own booking starts', async () => {
      await book(f.tokens.alice, f.padel.id, '2030-01-11T19:00:00Z', 2).expect(201);
      expectBackToBack(
        await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2).expect(409),
      );
    });

    it('rejects two 1 h bookings in a row too (book one 2 h booking instead)', async () => {
      await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z').expect(201);
      expectBackToBack(await book(f.tokens.alice, f.padel.id, '2030-01-11T18:00:00Z').expect(409));
    });

    it('allows another user to book right after me', async () => {
      await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2).expect(201);
      await book(f.tokens.bob, f.padel.id, '2030-01-11T19:00:00Z', 2).expect(201);
    });

    it('allows me to book again after a gap of at least an hour', async () => {
      await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2).expect(201);
      await book(f.tokens.alice, f.padel.id, '2030-01-11T20:00:00Z', 2).expect(201);
    });

    it('allows me to book a different court right after', async () => {
      await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2).expect(201);
      await book(f.tokens.alice, f.tennis.id, '2030-01-11T19:00:00Z').expect(201);
    });

    it('allows it once the neighbouring booking is cancelled', async () => {
      const first = await book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2).expect(201);
      await ctx.http
        .post(`/api/bookings/${first.body.id}/cancel`)
        .set(auth(f.tokens.alice))
        .expect(200);
      await book(f.tokens.alice, f.padel.id, '2030-01-11T19:00:00Z', 2).expect(201);
    });

    it('lets only one of two simultaneous back-to-back requests succeed', async () => {
      const responses = await Promise.all([
        book(f.tokens.alice, f.padel.id, '2030-01-11T17:00:00Z', 2),
        book(f.tokens.alice, f.padel.id, '2030-01-11T19:00:00Z', 2),
      ]);
      expect(responses.map((r) => r.status).toSorted((a, b) => a - b)).toEqual([201, 409]);
      expectBackToBack(responses.find((r) => r.status === 409)!);
    });

    it('is enforced by the database itself, even when the service is bypassed', async () => {
      const repo = ctx.dataSource.getRepository(Booking);
      const row = (startsAt: string, endsAt: string) => ({
        courtId: f.padel.id,
        userId: f.alice.id,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        priceCents: 2400,
      });
      await repo.insert(row('2030-01-11T17:00:00Z', '2030-01-11T18:00:00Z'));
      await expect(
        repo.insert(row('2030-01-11T18:00:00Z', '2030-01-11T19:00:00Z')),
      ).rejects.toMatchObject({
        driverError: { code: '23P01', constraint: 'bookings_no_back_to_back_same_user' },
      });
    });
  });

  describe('opening hours', () => {
    it('allows a booking from opening time', async () => {
      await book(f.tokens.bob, f.tennis.id, '2030-01-11T09:00:00Z').expect(201);
    });

    it('allows a 2 h booking ending exactly at closing time', async () => {
      await book(f.tokens.bob, f.tennis.id, '2030-01-11T19:00:00Z', 2).expect(201);
    });

    it.each([
      ['starts before opening', '2030-01-11T08:00:00Z', 1],
      ['runs past closing', '2030-01-11T20:00:00Z', 2],
      ['starts at closing time', '2030-01-11T21:00:00Z', 1],
    ])('rejects a booking that %s', async (_case, startsAt, hours) => {
      const res = await book(f.tokens.bob, f.tennis.id, startsAt, hours).expect(422);
      expect(res.body.error).toMatchObject({
        code: 'OUTSIDE_OPENING_HOURS',
        message: 'This court is open 09:00–21:00',
      });
    });

    it('rejects a duration other than 1 or 2 hours', async () => {
      const res = await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z', 3).expect(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_FAILED',
        details: { hours: ['hours must be 1 or 2'] },
      });
    });

    it('rejects a start that is not on the hour', async () => {
      const res = await book(f.tokens.bob, f.padel.id, '2030-01-11T10:30:00Z').expect(422);
      expect(res.body.error.code).toBe('INVALID_START');
    });

    it('rejects a booking on a deactivated court', async () => {
      await ctx.dataSource.getRepository(Court).update(f.padel.id, { isActive: false });
      const res = await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z').expect(422);
      expect(res.body.error.code).toBe('COURT_INACTIVE');
    });
  });

  describe('bookings in the past', () => {
    it('rejects a slot that has already started (now = 09:00)', async () => {
      const res = await book(f.tokens.bob, f.padel.id, '2030-01-10T09:00:00Z').expect(422);
      expect(res.body.error.code).toBe('BOOKING_IN_PAST');
    });

    it('allows the next slot', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-10T10:00:00Z').expect(201);
    });
  });

  describe('booking price', () => {
    it('stores price × hours at booking time, unaffected by later price changes', async () => {
      const res = await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z', 2).expect(201);
      expect(res.body.priceCents).toBe(4800);

      await ctx.http
        .patch(`/api/admin/courts/${f.padel.id}`)
        .set(auth(f.tokens.admin))
        .send({ priceCents: 3000 })
        .expect(200);
      const saved = await ctx.dataSource
        .getRepository(Booking)
        .findOneByOrFail({ id: res.body.id });
      expect(saved.priceCents).toBe(4800);
    });
  });

  describe('cancellation window (up to 2 hours before start)', () => {
    const START = '2030-01-10T14:00:00Z';
    const cancel = (token: string, id: string) =>
      ctx.http.post(`/api/bookings/${id}/cancel`).set(auth(token));

    it('allows cancelling exactly 2 hours before the start', async () => {
      const { body } = await book(f.tokens.bob, f.padel.id, START).expect(201);
      ctx.clock.set('2030-01-10T12:00:00Z');
      const res = await cancel(f.tokens.bob, body.id).expect(200);
      expect(res.body).toMatchObject({ status: 'cancelled', cancelledBy: 'user' });
    });

    it('rejects cancelling 1 minute inside the window, with a clear error', async () => {
      const { body } = await book(f.tokens.bob, f.padel.id, START).expect(201);
      ctx.clock.set('2030-01-10T12:01:00Z');
      const res = await cancel(f.tokens.bob, body.id).expect(422);
      expect(res.body.error).toEqual({
        code: 'CANCELLATION_WINDOW_CLOSED',
        message: 'Bookings can only be cancelled up to 2 hours before they start',
      });
    });

    it('rejects cancelling a booking that has already started', async () => {
      const { body } = await book(f.tokens.bob, f.padel.id, START).expect(201);
      ctx.clock.set('2030-01-10T14:30:00Z');
      await cancel(f.tokens.bob, body.id).expect(422);
    });

    it("rejects cancelling someone else's booking", async () => {
      const { body } = await book(f.tokens.bob, f.padel.id, START).expect(201);
      const res = await cancel(f.tokens.alice, body.id).expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects cancelling twice', async () => {
      const { body } = await book(f.tokens.bob, f.padel.id, START).expect(201);
      await cancel(f.tokens.bob, body.id).expect(200);
      const res = await cancel(f.tokens.bob, body.id).expect(409);
      expect(res.body.error.code).toBe('BOOKING_ALREADY_CANCELLED');
    });
  });

  describe('my bookings', () => {
    it('splits into upcoming and past, and only shows my own', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-10T10:00:00Z').expect(201);
      await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z').expect(201);
      await book(f.tokens.alice, f.padel.id, '2030-01-11T12:00:00Z').expect(201);
      ctx.clock.set('2030-01-10T12:00:00Z'); // the first booking is now over

      const { body } = await ctx.http.get('/api/bookings/me').set(auth(f.tokens.bob)).expect(200);
      expect(body.upcoming.map((b: { startsAt: string }) => b.startsAt)).toEqual([
        '2030-01-11T10:00:00.000Z',
      ]);
      expect(body.past.map((b: { startsAt: string }) => b.startsAt)).toEqual([
        '2030-01-10T10:00:00.000Z',
      ]);
    });
  });
});
