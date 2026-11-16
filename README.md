# Courtly

A sports court booking platform. Users book padel, tennis and squash courts by the hour; admins manage courts and see each day's bookings and expected revenue.

React + TypeScript frontend, NestJS + TypeScript API, PostgreSQL with database-level double-booking prevention.

## How to run

Requirements: Docker.

```bash
docker compose up
```

Then open **http://localhost:8080**.

| Service | Where |
|---|---|
| Web app (nginx, proxies `/api` to the API) | http://localhost:8080 |
| PostgreSQL | `localhost:5433` (user / password / db: `courtly`) |
| API | not published; reached through nginx at `/api` |

### Accounts

Anyone can sign up from the login page ("Create one"); new accounts always get the `user` role. Seeded demo accounts:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@courtly.test` | `admin123` |
| User | `alice@courtly.test` | `user123` |
| User | `bob@courtly.test` | `user123` |

On first start the API runs the migrations and seeds demo data: 6 courts (Squash 2 is inactive) and 10 bookings dated relative to today. The seed is skipped if users already exist. To start over:

```bash
docker compose down -v
```

### Tests

Needs Node 24 and the Postgres container running (`docker compose up db`).

```bash
cd api
npm ci
npm test            # 24 unit tests: booking rules, slots, DST
npm run test:e2e    # 37 integration tests against a real Postgres (creates `courtly_test`)
```

The integration tests cover the three required cases (double booking including concurrent requests, the cancellation window, opening hours) plus sign-up and login, roles, validation and the admin flows.

## Stack and trade-offs

- **Backend: NestJS 12, TypeORM, PostgreSQL 17.** Nest gives guards, pipes, exception filters and DI out of the box, so the structure isn't hand-rolled. Postgres because it has exclusion constraints (see below).
- **Frontend: React 19, MUI 9, Redux Toolkit with RTK Query, React Router, Vite.** RTK Query covers fetching, caching and invalidation, so no Saga. MUI gives accessible components without building a design system.
- **Fewer libraries:** JWT via `@nestjs/jwt` with two small global guards instead of Passport; dayjs for time zones; class-validator for DTOs.
- **Docker:** three containers (`db`, `api`, `web`). The API migrates and seeds on startup; nginx serves the SPA and proxies `/api`, so there's no CORS setup.
- **Trade-off:** API response types are duplicated in the frontend. A shared types package would be the next step.

More decisions, with the alternatives rejected, are in [PLAN.md](PLAN.md).

## How double booking is prevented

The guarantee lives in the database, not in application code:

```sql
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed')
```

- Postgres rejects any confirmed booking that overlaps another on the same court, even when requests arrive at the same moment. The API maps that error (`23P01`) to `409 SLOT_TAKEN`.
- Only confirmed bookings count, so a cancelled booking frees the slot.
- Creating a booking reads the court with `FOR SHARE`; admin court edits take `FOR UPDATE`. A booking can't slip in while a court is being deactivated or its hours changed.
- Tested by firing 10 parallel requests for the same slot: exactly one gets `201`, nine get `409`. A raw insert that bypasses the API is rejected too.

Rejected alternatives:

- **Check, then insert** in application code: a race between the check and the insert.
- **Unique index on start time:** misses overlaps with 2-hour bookings.
- **Serializable transactions or advisory locks:** more moving parts, and the rule lives in code instead of the schema.

## Business rules and decisions

- Bookings are 1 or 2 hours, start on the hour, must fall within opening hours and can't be in the past.
- A booking can be cancelled up to 2 hours before it starts (exactly 2 hours is still allowed).
- Times use the facility's time zone, `Europe/Lisbon` (DST is tested), and are stored as `timestamptz`.
- Each booking keeps the price at booking time, so later price changes don't rewrite past revenue.
- Cancelling is soft: `status`, `cancelled_at` and `cancelled_by` (user or admin). Nothing is deleted.
- Deactivating a court keeps its history.
- If a court change (deactivating it, new opening hours) affects upcoming bookings, the API answers `409` with the count. After the admin confirms, the change and the cancellations run in one transaction.
- Roles are enforced on the API, with no hierarchy: only users book; only admins manage courts and see the day view.
- The day view's expected revenue counts confirmed bookings only.
- Sign-up always creates a `user`; the request can't set a role (unknown fields are rejected), so admins exist only through the seed. Emails are unique case-insensitively, enforced by the database. Passwords are 8–72 characters (bcrypt uses at most 72 bytes) and stored as bcrypt hashes.
- Passwords travel as plain text inside the request body, as is standard: transport security is HTTPS's job. Hashing in the browser would just make the hash the password.
- Every error has one shape: `{ "error": { "code", "message", "details" } }`.

## What I'd do next

- Serve over HTTPS (TLS at nginx or a load balancer) with HSTS, and rate-limit login and sign-up.
- Email verification and password reset. Sign-up currently reveals whether an email is registered (`409 EMAIL_TAKEN`); with email verification it could answer the same way in both cases.
- Store the token in an httpOnly cookie instead of `localStorage`, and add refresh tokens (today the role stays in the JWT for 8 hours).
- Run migrations as a separate deploy step instead of on startup (fine for a single instance).
- Opening hours per weekday, and courts open past midnight.
- Real-time availability via SSE or WebSocket (now it polls every 30 seconds and refreshes on focus).
- A limit on how far ahead people can book, pagination and an audit log.
- Frontend tests and a shared types package.
