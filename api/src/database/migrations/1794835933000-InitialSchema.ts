import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1794835933000 implements MigrationInterface {
  name = 'InitialSchema1794835933000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // btree_gist lets a GiST index combine plain equality (court_id =) with range overlap (&&).
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    await queryRunner.query(`CREATE TYPE user_role AS ENUM ('user', 'admin')`);
    await queryRunner.query(`CREATE TYPE court_sport AS ENUM ('tennis', 'padel', 'squash')`);
    await queryRunner.query(`CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled')`);
    await queryRunner.query(`CREATE TYPE booking_cancelled_by AS ENUM ('user', 'admin')`);

    await queryRunner.query(`
      CREATE TABLE users (
        id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        email         varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        name          varchar(100) NOT NULL,
        role          user_role    NOT NULL DEFAULT 'user',
        created_at    timestamptz  NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE courts (
        id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
        name        varchar(100) NOT NULL UNIQUE,
        sport       court_sport  NOT NULL,
        price_cents integer      NOT NULL,
        opens_at    time         NOT NULL,
        closes_at   time         NOT NULL,
        is_active   boolean      NOT NULL DEFAULT true,
        created_at  timestamptz  NOT NULL DEFAULT now(),
        updated_at  timestamptz  NOT NULL DEFAULT now(),
        CONSTRAINT courts_price_positive_chk CHECK (price_cents > 0),
        CONSTRAINT courts_hours_order_chk    CHECK (closes_at > opens_at),
        -- Slots are whole hours, so opening/closing must fall on the hour.
        CONSTRAINT courts_hours_on_the_hour_chk CHECK (
          extract(minute FROM opens_at) = 0 AND extract(second FROM opens_at) = 0
          AND extract(minute FROM closes_at) = 0 AND extract(second FROM closes_at) = 0
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE bookings (
        id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
        court_id     uuid                 NOT NULL REFERENCES courts (id) ON DELETE RESTRICT,
        user_id      uuid                 NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
        starts_at    timestamptz          NOT NULL,
        ends_at      timestamptz          NOT NULL,
        price_cents  integer              NOT NULL,
        status       booking_status       NOT NULL DEFAULT 'confirmed',
        cancelled_at timestamptz,
        cancelled_by booking_cancelled_by,
        created_at   timestamptz          NOT NULL DEFAULT now(),

        CONSTRAINT bookings_price_positive_chk CHECK (price_cents > 0),
        CONSTRAINT bookings_duration_chk CHECK (
          ends_at - starts_at IN (interval '1 hour', interval '2 hours')
        ),
        -- Evaluated in UTC so the result never depends on the session's TimeZone.
        -- Lisbon's offset is always a whole hour, so a UTC hour boundary is a Lisbon one too.
        CONSTRAINT bookings_on_the_hour_chk CHECK (
          date_trunc('hour', starts_at AT TIME ZONE 'UTC') = starts_at AT TIME ZONE 'UTC'
        ),
        CONSTRAINT bookings_cancel_fields_chk CHECK (
          (status = 'cancelled') = (cancelled_at IS NOT NULL)
          AND (cancelled_at IS NULL) = (cancelled_by IS NULL)
        ),

        -- THE double-booking guarantee: no two confirmed bookings on the same court may have
        -- overlapping [starts_at, ends_at) ranges. Postgres checks this atomically on every
        -- INSERT/UPDATE, so two simultaneous requests cannot both succeed (the loser gets 23P01).
        -- Half-open '[)' ranges: 10:00-11:00 and 11:00-12:00 do not overlap.
        -- Cancelled rows are ignored, so a cancelled slot can be booked again.
        CONSTRAINT bookings_no_overlap EXCLUDE USING gist (
          court_id WITH =,
          tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status = 'confirmed')
      )
    `);

    // Admin day view: all bookings in a time window across courts.
    await queryRunner.query(`CREATE INDEX bookings_starts_at_idx ON bookings (starts_at)`);
    // "My bookings": one user's bookings ordered by time.
    await queryRunner.query(
      `CREATE INDEX bookings_user_starts_at_idx ON bookings (user_id, starts_at)`,
    );
    // Availability (one court, one day) is served by the GiST index behind bookings_no_overlap.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE bookings`);
    await queryRunner.query(`DROP TABLE courts`);
    await queryRunner.query(`DROP TABLE users`);
    await queryRunner.query(`DROP TYPE booking_cancelled_by`);
    await queryRunner.query(`DROP TYPE booking_status`);
    await queryRunner.query(`DROP TYPE court_sport`);
    await queryRunner.query(`DROP TYPE user_role`);
    // btree_gist is left installed: other objects may depend on it and it is harmless.
  }
}
