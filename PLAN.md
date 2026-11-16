# Courtly — work plan

Deadline: **Wed 18 Nov, 10:50 Lisbon**. Target: core done Tue evening, Wed morning = buffer + submission.

Full brief: `REQUIREMENTS.md` (kept locally, not committed).

## Decisions so far

| Area | Choice | Rejected |
|---|---|---|
| Frontend | React + Vite + TS strict, MUI, Redux Toolkit (RTK Query), React Router | Next.js (needless 2nd server), CRA (deprecated), Redux-Saga (boilerplate, no complex async flows) |
| Backend | NestJS (guards, pipes, exception filters, DI) | Express (would hand-roll structure) |
| DB | PostgreSQL — exclusion constraint for double bookings | MySQL/Mongo (no exclusion constraints) |
| Data access | TypeORM (`@nestjs/typeorm`), constraint as raw SQL in migration | Prisma (awkward with Nest DI), raw `pg` |
| Validation / auth | class-validator DTOs, `@nestjs/jwt` + bcryptjs (no Passport) | zod, Passport (unneeded for seeded login) |
| Time | dayjs + tz, facility zone `Europe/Lisbon`, store `timestamptz` | — |
| Tests | Vitest + supertest against real Postgres (Vitest = NestJS 12 default; Nest 12 is ESM-only, so imports end in `.js`) | Jest (no longer Nest's default, ESM friction), mocks-only (can't prove concurrency) |
| npm registry | per-package `.npmrc` → `registry.npmjs.org` | inheriting the global (private work) registry → private URLs in a public lockfile, reviewers can't install |
| Docker | `db` + `api` (migrate → seed → start) + `web` (nginx, proxies `/api`) | separate migrate container, CORS setup |
| Schema vs data | migrations = schema only, seed = idempotent demo data relative to today | admin/courts inside migrations |
| IDs | uuid | serial ints (guessable) |
| Sport | Postgres enum `tennis`/`padel`/`squash` + TS enum | free text |
| Seed prices | fixed per sport | random (revenue not reproducible) |
| Revenue | `bookings.price_cents` snapshot | court price × hours at query time (price edits rewrite history) |
| Court change hitting upcoming bookings | 409 + confirm dialog → apply & cancel in one transaction | silently allow, plain reject, auto-cancel without asking |

Open: shared types package vs duplicating types in `web/` (default: duplicate, small surface).

## Data model (agreed)

All ids are `uuid` (`gen_random_uuid()`), all timestamps `timestamptz`.

- **users**: id, email (unique), password_hash (bcrypt, never returned), name, role (enum `user`|`admin`), created_at
- **courts**: id, name (unique), sport (enum `tennis`|`padel`|`squash`), price_cents (int > 0), opens_at / closes_at (`time`, closes > opens, same every day, no past-midnight), is_active, created_at, updated_at
- **bookings**: id, court_id → courts (RESTRICT), user_id → users (RESTRICT), starts_at, ends_at, price_cents (**snapshot** = court price × hours at booking time), status (enum `confirmed`|`cancelled`), cancelled_at, cancelled_by (enum `user`|`admin`, null unless cancelled), created_at
  - `EXCLUDE USING gist (court_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')` — half-open `[)`, back-to-back OK, cancelled slots rebookable
  - `CHECK (ends_at - starts_at IN ('1 hour', '2 hours'))`, `CHECK (date_trunc('hour', starts_at) = starts_at)`, `CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL))`
  - indexes: GiST from the constraint (availability), btree `starts_at` (admin day view), btree `(user_id, starts_at)` (my bookings)

Why the price snapshot: revenue must reflect what was agreed at booking time; a later court price change must not rewrite history.

### Seed (not a migration — migrations are schema only)

| Court | Sport | €/h | Hours | Active |
|---|---|---|---|---|
| Padel 1 | padel | 24 | 08–23 | ✓ |
| Padel 2 | padel | 24 | 08–23 | ✓ |
| Tennis 1 | tennis | 18 | 09–21 | ✓ |
| Tennis 2 | tennis | 18 | 09–21 | ✓ |
| Squash 1 | squash | 12 | 10–22 | ✓ |
| Squash 2 | squash | 12 | 10–22 | ✗ (has past booking — shows history kept) |

Users: `admin@courtly.test` / `admin123`, `alice@courtly.test` / `user123`, `bob@courtly.test` / `user123`. ~8 bookings relative to today (past, later today, tomorrow, one cancelled). Idempotent.

### Court changes that affect upcoming bookings (deactivate, or edit hours so bookings fall outside)

1. Admin request without confirmation → if no affected upcoming bookings, apply.
2. Otherwise **409** `COURT_HAS_UPCOMING_BOOKINGS` with the count.
3. UI dialog: "N upcoming bookings affected — **Apply and cancel them** / **Keep as is**".
4. Confirmed retry with `cancelBookings=true` → change + cancel affected bookings in **one transaction**, `cancelled_by = 'admin'`.
- Admin cancellation ignores the 2 h window; only bookings not yet started are touched.

## Business rules → errors

| Rule | Where | Error |
|---|---|---|
| Slot already taken (incl. same-instant submits) | DB constraint, caught in service | 409 `SLOT_TAKEN` |
| Start in the past | BookingService | 422 `BOOKING_IN_PAST` |
| Outside opening hours / not on the hour | BookingService | 422 `OUTSIDE_OPENING_HOURS` / `INVALID_START` |
| Duration not 1 or 2 h | DTO validation | 400 |
| Court inactive | BookingService | 422 `COURT_INACTIVE` |
| Cancel < 2 h before start | BookingService | 422 `CANCELLATION_WINDOW_CLOSED` |
| Cancel someone else's booking | BookingService | 403 |
| Deactivate / change hours with affected upcoming bookings, no confirmation | CourtsService | 409 `COURT_HAS_UPCOMING_BOOKINGS` |
| Non-admin on admin routes | RolesGuard | 403 |

## Steps (≈ one commit each — you commit)

| # | Step | Done when |
|---|---|---|
| 1 | Repo skeleton: `api/`, `web/`, `.gitignore`, `.editorconfig`, minimal `docker-compose.yml` with `db` only | `docker compose up db` is healthy |
| 2 | API scaffold: Nest, TS strict, config, TypeORM connection, `GET /health` | API runs locally against compose db |
| 3 | Schema: entities + migration (tables, `btree_gist`, exclusion constraint) | migration runs; manual overlapping insert is rejected |
| 4 | Seed: admin, 2 users, 6 courts (Squash 2 inactive), ~8 bookings relative to today; idempotent | re-run seed adds nothing |
| 5 | Auth: login, JWT guard, `@Roles` + RolesGuard, global exception filter `{ error: { code, message } }` | user token gets 403 on admin route |
| 6 | Courts: list (active / all for admin), admin create / edit / deactivate, 409 + `cancelBookings` confirm flow | deactivated court keeps bookings; confirm cancels in one transaction |
| 7 | Availability: `GET /courts/:id/availability?date=` | slots respect hours + bookings, Lisbon time |
| 8 | Bookings: create (rules + 409), `GET /bookings/me` (upcoming/past), cancel (soft, 2 h window) | rules return the errors above |
| 9 | Admin day view: `GET /admin/bookings?date=` + total revenue | revenue = sum of confirmed snapshots |
| 10 | Backend tests: unit (cancel window, opening hours, past, durations) + integration (2 parallel bookings → 1×201 + 1×409; 1h vs 2h overlap) | `npm test` green |
| 11 | Docker: api + web Dockerfiles, full compose, startup migrate + seed | fresh clone → `docker compose up` → working app |
| 12 | Web scaffold: Vite, MUI, router, RTK Query base API, auth slice, login page, protected routes | login works through nginx `/api` proxy |
| 13 | User screens: courts, availability grid + booking (1–2 h), my bookings + cancel with error messages | full user flow in browser |
| 14 | Admin screens: courts CRUD/deactivate, day view + revenue | full admin flow in browser |
| 15 | (bonus) Frontend tests: Vitest + RTL for slot grid / cancel button | — |
| 16 | (bonus, pick one) Performance note: 10k+ bookings, `EXPLAIN ANALYZE` numbers for availability + day view | — |
| 17 | README (**written by you**) from `DECISIONS.md` notes; final fresh-clone check | — |
| 18 | Submit repo link + short decisions note on the challenge page | before Wed 10:50 |

Suggested pacing: Mon 1–6 · Tue 7–14 · Wed morning 15–18.
