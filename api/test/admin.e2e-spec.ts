import { Booking } from '../src/bookings/booking.entity.js';
import {
  auth,
  createTestApp,
  type Fixtures,
  resetWithFixtures,
  type TestContext,
} from './helpers.js';

const NOW = '2030-01-10T09:00:00Z';

describe('Roles, court management and admin day view (integration)', () => {
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
    ctx.http.post('/api/bookings').set(auth(token)).send({ courtId, startsAt, hours }).expect(201);

  describe('role separation is enforced by the API', () => {
    it('rejects requests without a token (401)', async () => {
      const res = await ctx.http.get('/api/courts').expect(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    });

    it.each([
      ['GET', '/api/admin/courts'],
      ['POST', '/api/admin/courts'],
      ['GET', '/api/admin/bookings?date=2030-01-10'],
    ])('rejects a user on admin route %s %s (403)', async (method, url) => {
      const res = await ctx.http[method === 'GET' ? 'get' : 'post'](url)
        .set(auth(f.tokens.alice))
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects an admin on user-only booking routes (403)', async () => {
      await ctx.http.get('/api/bookings/me').set(auth(f.tokens.admin)).expect(403);
    });
  });

  describe('creating a court', () => {
    const create = (body: object) =>
      ctx.http.post('/api/admin/courts').set(auth(f.tokens.admin)).send(body);
    const valid = {
      name: 'Squash 1',
      sport: 'squash',
      priceCents: 1200,
      opensAt: '10:00',
      closesAt: '22:00',
    };

    it('creates an active court that users can then see', async () => {
      const res = await create({ ...valid, name: '  Squash 1  ' }).expect(201);
      expect(res.body).toMatchObject({ ...valid, isActive: true });
      await ctx.http.get(`/api/courts/${res.body.id}`).set(auth(f.tokens.bob)).expect(200);
    });

    it('refuses a name that is already taken (409)', async () => {
      const res = await create({ ...valid, name: 'Padel 1' }).expect(409);
      expect(res.body.error.code).toBe('COURT_NAME_TAKEN');
    });

    it('refuses a closing time that is not after opening (400)', async () => {
      const res = await create({ ...valid, opensAt: '22:00', closesAt: '10:00' }).expect(400);
      expect(res.body.error).toMatchObject({
        code: 'VALIDATION_FAILED',
        details: { closesAt: ['closesAt must be later than opensAt'] },
      });
    });
  });

  describe('deactivating a court with upcoming bookings', () => {
    it('refuses with 409 first, then on confirmation deactivates and cancels them', async () => {
      const past = await book(f.tokens.bob, f.padel.id, '2030-01-10T10:00:00Z');
      const upcoming = await book(f.tokens.alice, f.padel.id, '2030-01-12T10:00:00Z');
      ctx.clock.set('2030-01-11T09:00:00Z'); // the first booking is now in the past

      const refused = await ctx.http
        .patch(`/api/admin/courts/${f.padel.id}`)
        .set(auth(f.tokens.admin))
        .send({ isActive: false })
        .expect(409);
      expect(refused.body.error).toMatchObject({
        code: 'COURT_HAS_UPCOMING_BOOKINGS',
        details: { affectedBookings: 1 },
      });

      await ctx.http
        .patch(`/api/admin/courts/${f.padel.id}?cancelAffectedBookings=true`)
        .set(auth(f.tokens.admin))
        .send({ isActive: false })
        .expect(200);

      const repo = ctx.dataSource.getRepository(Booking);
      expect(await repo.findOneByOrFail({ id: upcoming.body.id })).toMatchObject({
        status: 'cancelled',
        cancelledBy: 'admin',
      });
      // History is kept: the past booking is untouched and still in the table.
      expect(await repo.findOneByOrFail({ id: past.body.id })).toMatchObject({
        status: 'confirmed',
      });
      // Users no longer see the court.
      await ctx.http.get(`/api/courts/${f.padel.id}`).set(auth(f.tokens.bob)).expect(404);
    });

    it('refuses new opening hours that would strand an upcoming booking', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-12T20:00:00Z');
      const res = await ctx.http
        .patch(`/api/admin/courts/${f.padel.id}`)
        .set(auth(f.tokens.admin))
        .send({ closesAt: '20:00' })
        .expect(409);
      expect(res.body.error.details).toEqual({ affectedBookings: 1 });
    });
  });

  describe('availability', () => {
    it('marks taken, past and available slots within opening hours', async () => {
      await book(f.tokens.bob, f.tennis.id, '2030-01-10T12:00:00Z', 2);
      const { body } = await ctx.http
        .get(`/api/courts/${f.tennis.id}/availability?date=2030-01-10`)
        .set(auth(f.tokens.alice))
        .expect(200);

      const byTime = Object.fromEntries(
        body.slots.map((s: { time: string; status: string }) => [s.time, s.status]),
      );
      expect(body.slots).toHaveLength(12); // 09:00–21:00
      expect(byTime['09:00']).toBe('past'); // now = 09:00, already started
      expect(byTime['10:00']).toBe('available');
      expect(byTime['12:00']).toBe('taken');
      expect(byTime['13:00']).toBe('taken'); // second hour of the 2 h booking
      expect(byTime['14:00']).toBe('available');
    });
  });

  describe('admin day view', () => {
    it('lists all courts’ bookings for the day and sums revenue of confirmed ones', async () => {
      await book(f.tokens.bob, f.padel.id, '2030-01-11T10:00:00Z', 2); // €48
      await book(f.tokens.alice, f.tennis.id, '2030-01-11T10:00:00Z'); // €18
      const cancelled = await book(f.tokens.alice, f.padel.id, '2030-01-11T15:00:00Z'); // €24
      await ctx.http
        .post(`/api/bookings/${cancelled.body.id}/cancel`)
        .set(auth(f.tokens.alice))
        .expect(200);
      await book(f.tokens.bob, f.padel.id, '2030-01-12T10:00:00Z'); // other day

      const { body } = await ctx.http
        .get('/api/admin/bookings?date=2030-01-11')
        .set(auth(f.tokens.admin))
        .expect(200);
      expect(body).toMatchObject({
        totalRevenueCents: 6600,
        confirmedCount: 2,
        cancelledCount: 1,
      });
      expect(body.bookings).toHaveLength(3);
    });
  });
});
