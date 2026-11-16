import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { User, UserRole } from '../src/users/user.entity.js';
import { auth, createTestApp, resetWithFixtures, type TestContext } from './helpers.js';

describe('Registration and login (integration)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp('2030-01-10T12:00:00Z');
  });
  afterAll(() => ctx.close());
  beforeEach(async () => {
    await resetWithFixtures(ctx);
  });

  const signUp = (body: object) => ctx.http.post('/api/auth/register').send(body);

  it('creates a user account, signs it in, and the new password works for login', async () => {
    const res = await signUp({ name: ' Carol ', email: ' Carol@Example.com ', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Carol', email: 'carol@example.com', role: 'user' });
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // The returned token is a working session for a user-only route.
    const mine = await ctx.http.get('/api/bookings/me').set(auth(res.body.accessToken));
    expect(mine.status).toBe(200);

    const login = await ctx.http
      .post('/api/auth/login')
      .send({ email: 'carol@example.com', password: 'secret123' });
    expect(login.status).toBe(200);

    // Stored as a bcrypt hash, never as the password itself.
    const stored = await ctx.dataSource.getRepository(User).findOne({
      where: { email: 'carol@example.com' },
      select: { passwordHash: true },
    });
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored?.passwordHash).not.toContain('secret123');
  });

  it('refuses an email that is already registered, ignoring case (409)', async () => {
    const res = await signUp({ name: 'Alice 2', email: 'ALICE@test.local', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('lets only one of two simultaneous sign-ups with the same email through', async () => {
    const body = { name: 'Dave', email: 'dave@example.com', password: 'secret123' };
    const statuses = (await Promise.all([signUp(body), signUp(body)])).map((r) => r.status);
    expect(statuses.toSorted((a, b) => a - b)).toEqual([201, 409]);
  });

  it('cannot be used to create an admin', async () => {
    const res = await signUp({
      name: 'Eve',
      email: 'eve@example.com',
      password: 'secret123',
      role: UserRole.Admin,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(await ctx.dataSource.getRepository(User).countBy({ email: 'eve@example.com' })).toBe(0);
  });

  it('validates name, email and password length', async () => {
    const res = await signUp({ name: ' ', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details).toSorted()).toEqual(['email', 'name', 'password']);
  });

  it('answers a wrong password and an unknown email the same way (401)', async () => {
    const wrong = await ctx.http
      .post('/api/auth/login')
      .send({ email: 'alice@test.local', password: 'wrong-password' });
    const unknown = await ctx.http
      .post('/api/auth/login')
      .send({ email: 'nobody@test.local', password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
  });
});
