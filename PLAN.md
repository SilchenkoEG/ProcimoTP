# Courtly — plan and working log

How the work was planned, the decisions taken (and rejected), and how it actually went, iteration by iteration. The README covers how to run it; this file covers how it got there.

## How we worked

- **Plan first.** Before any code: stack, data model, business rules and their error codes, and a numbered list of steps, each with a "done when". The tables below are that plan, kept up to date.
- **One step = one commit.** Small, reviewable commits with Conventional Commit messages, so the history reads like the plan.
- **The rule lives in the database when it must hold under concurrency.** Application checks give clear errors; constraints give the guarantee.
- **Test what can break.** Integration tests run against a real Postgres (not mocks), because concurrency can't be proven with mocks.
- **Review after each iteration.** Read the code back looking for duplication and gaps, click through every screen, then fix before moving on.
- **Decisions are written down with the alternative rejected**, in the tables below and in the iteration log.

## Decisions

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
| Cancel endpoint | `POST /bookings/:id/cancel` (state change, row kept) | `DELETE` (implies removal) |
| Who books | `user` role only; admin manages courts + sees all bookings | admin also booking (blurs the role split) |
| Court vs booking race | booking reads court `FOR SHARE`, court edit takes `FOR UPDATE` | no lock (booking could land on a court being deactivated) |
| `startsAt` input | ISO with explicit offset required | bare local datetime (parsed in server TZ → ambiguous) |
| Shared types | duplicated in `web/src/api/types.ts` (small surface, `web/` and `api/` build independently) | shared package (extra build/workspace setup for ~10 types) |
| Sign-up | public `POST /auth/register`, role always `user`, unknown fields rejected | role in the request, admin-created accounts only |
| Passwords in transit | plain in the JSON body, protected by HTTPS | hashing in the browser (the hash becomes the password) |
| Creating admins | only via the seed | admin "promote user" screen (out of scope, and the riskiest feature to add last-minute) |
| Back-to-back bookings | 2nd exclusion constraint: same user + same court + touching ranges (`-|-`) rejected | allow (4 h via two bookings), app-level check (racy without extra locking) |
| Fonts / UI | MUI theme + Inter via one Google Fonts link | `@fontsource` package, a second UI library |
| `index.html` caching | `Cache-Control: no-cache` (assets stay immutable, hashed) | default heuristic caching (stale app after a rebuild) |

## Data model (agreed)

All ids are `uuid` (`gen_random_uuid()`), all timestamps `timestamptz`.

- **users**: id, email (unique), password_hash (bcrypt, never returned), name, role (enum `user`|`admin`), created_at
- **courts**: id, name (unique), sport (enum `tennis`|`padel`|`squash`), price_cents (int > 0), opens_at / closes_at (`time`, closes > opens, same every day, no past-midnight), is_active, created_at, updated_at
- **bookings**: id, court_id → courts (RESTRICT), user_id → users (RESTRICT), starts_at, ends_at, price_cents (**snapshot** = court price × hours at booking time), status (enum `confirmed`|`cancelled`), cancelled_at, cancelled_by (enum `user`|`admin`, null unless cancelled), created_at
  - `EXCLUDE USING gist (court_id WITH =, tstzrange(starts_at, ends_at) WITH &&) WHERE (status = 'confirmed')` — half-open `[)`, back-to-back OK, cancelled slots rebookable
  - `EXCLUDE USING gist (user_id WITH =, court_id WITH =, tstzrange(starts_at, ends_at) WITH -|-) WHERE (status = 'confirmed')` — added in iteration 4: the same user can't chain bookings on one court (max 2 h in a row)
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

Users: `admin@courtly.test` / `admin123`, `alice@courtly.test` / `user123`, `bob@courtly.test` / `user123`. 10 bookings relative to today (past, later today, tomorrow, cancelled by user and by admin). Runs only when there are no users yet.

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
| Same user, same court, directly before/after their own booking | DB constraint, caught in service | 409 `BACK_TO_BACK_BOOKING` |
| Sign-up with an email already registered (any case) | DB unique index, caught in service | 409 `EMAIL_TAKEN` |
| Start in the past | BookingService | 422 `BOOKING_IN_PAST` |
| Outside opening hours / not on the hour | BookingService | 422 `OUTSIDE_OPENING_HOURS` / `INVALID_START` |
| Duration not 1 or 2 h | DTO validation | 400 |
| Court inactive | BookingService | 422 `COURT_INACTIVE` |
| Cancel < 2 h before start | BookingService | 422 `CANCELLATION_WINDOW_CLOSED` |
| Cancel someone else's booking | BookingService | 403 |
| Deactivate / change hours with affected upcoming bookings, no confirmation | CourtsService | 409 `COURT_HAS_UPCOMING_BOOKINGS` |
| Non-admin on admin routes | RolesGuard | 403 |

## Steps (the original plan, ≈ one commit each)

| # | Step | Done when | Status |
|---|---|---|---|
| 1 | Repo skeleton: `api/`, `web/`, `.gitignore`, `.editorconfig`, minimal `docker-compose.yml` with `db` only | `docker compose up db` is healthy | ✅ |
| 2 | API scaffold: Nest, TS strict, config, TypeORM connection, `GET /health` | API runs locally against compose db | ✅ |
| 3 | Schema: entities + migration (tables, `btree_gist`, exclusion constraint) | migration runs; manual overlapping insert is rejected | ✅ |
| 4 | Seed: admin, 2 users, 6 courts (Squash 2 inactive), bookings relative to today; idempotent | re-run seed adds nothing | ✅ |
| 5 | Auth: login, JWT guard, `@Roles` + RolesGuard, global exception filter `{ error: { code, message } }` | user token gets 403 on admin route | ✅ |
| 6 | Courts: list (active / all for admin), admin create / edit / deactivate, 409 + `cancelBookings` confirm flow | deactivated court keeps bookings; confirm cancels in one transaction | ✅ |
| 7 | Availability: `GET /courts/:id/availability?date=` | slots respect hours + bookings, Lisbon time | ✅ |
| 8 | Bookings: create (rules + 409), `GET /bookings/me` (upcoming/past), cancel (soft, 2 h window) | rules return the errors above | ✅ |
| 9 | Admin day view: `GET /admin/bookings?date=` + total revenue | revenue = sum of confirmed snapshots | ✅ |
| 10 | Backend tests: unit (cancel window, opening hours, past, durations) + integration (parallel bookings → 1×201 + rest 409; 1 h vs 2 h overlap) | `npm test` green | ✅ |
| 11 | Docker: api + web Dockerfiles, full compose, startup migrate + seed | fresh clone → `docker compose up` → working app | ✅ |
| 12 | Web scaffold: Vite, MUI, router, RTK Query base API, auth slice, login page, protected routes | login works through nginx `/api` proxy | ✅ |
| 13 | User screens: courts, availability grid + booking (1–2 h), my bookings + cancel with error messages | full user flow in browser | ✅ |
| 14 | Admin screens: courts CRUD/deactivate, day view + revenue | full admin flow in browser | ✅ |
| 15 | (bonus) Frontend tests: Vitest + RTL for slot grid / cancel button | — | not done |
| 16 | (bonus, pick one) Performance note: 10k+ bookings, `EXPLAIN ANALYZE` numbers for availability + day view | — | not done |
| 17 | README; final fresh-clone check | — | ✅ README · fresh-clone check before submitting |
| 18 | Submit repo link + short decisions note | — | before submitting |

## Iteration log

### Iteration 1 — build the plan (16 Nov, afternoon)

Steps 1–14 in order, one commit each: skeleton → API (schema, seed, auth, courts, availability, bookings, admin day view) → tests → Docker → web (scaffold, user screens, admin screens).

- The double-booking guarantee went into the very first migration, not added later.
- Tests were written against a real Postgres, including 10 parallel requests for one slot (exactly one `201`).

### Iteration 2 — first review as a user (16 Nov, evening)

Clicked through the running app from a fresh clone, as a reviewer would.

- **Demo passwords were printed on the login page** → removed; they live in the README only.
- **No way to create an account** → added sign-up. Role is always `user` and can't be sent in the request; emails are unique case-insensitively, enforced by the database; concurrent sign-ups with one email → one `201`, one `409`.
- Discussed hashing passwords in the browser → rejected (the hash would become the password; HTTPS is the right layer). Written into the README.
- README written: how to run, demo accounts, trade-offs, the concurrency mechanism, next steps.

### Iteration 3 — code review (16–17 Nov, night)

Read the code back, looking for copy-paste and missing tests.

- **API:** 7 duplications removed (time formatting, booking mapping, DTO fields via `PartialType`, email/trim transforms, "court not found", validation error, password hashing).
- **Tests:** checked every business rule against a test; added the real gaps (creating a court, `COURT_NAME_TAKEN`, closing before opening, a 3-hour booking).
- **Web:** 5 duplications removed (date navigator, confirm dialog, auth card, cache tags, slot type).
- **Two bugs found while testing the refactor:**
  - selecting a slot, then an admin closing that hour, crashed the page on the next refresh → the selection now shrinks or clears;
  - "refresh on focus" never worked (RTK Query needs `setupListeners`) → fixed, so the README's claim is now true.

### Iteration 4 — UI pass and a rule gap (17 Nov)

- **UI redesign:** the default MUI look replaced with a flat theme, a white header with an account menu, sport colours, slots grouped into morning / afternoon / evening, booked slots grey instead of red (red read as an error), calendar tiles in My bookings. No new libraries.
- **Found by testing as a user:** booking 17–19 and then 19–21 on the same court gave one person 4 hours, though a booking is limited to 2. The brief limits a single booking, so this wasn't a broken rule, but it defeated its purpose. Fixed with a second exclusion constraint (same user, same court, touching ranges) → `409 BACK_TO_BACK_BOOKING`, with 9 integration tests including simultaneous requests. Trade-off accepted: two 1-hour bookings in a row are rejected too (book one 2-hour slot instead).
- Also: an invalid court link showed its error twice → once; `index.html` is no longer cached, so a rebuild shows up without a hard refresh.
- Considered and rejected: letting an admin create other admins (outside the brief, and the riskiest thing to add at the end).

### Before submitting

- Fresh clone → `docker compose up` → sign in as admin and as a user.
- Check every commit's author email.
