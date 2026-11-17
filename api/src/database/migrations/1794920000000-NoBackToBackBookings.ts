import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NoBackToBackBookings1794920000000 implements MigrationInterface {
  name = 'NoBackToBackBookings1794920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A booking is 1 or 2 hours. Without this, one user could chain bookings on the same
    // court (17:00–19:00 + 19:00–21:00) and play for 4 hours. `-|-` means "the ranges touch
    // with no gap", so the same user can't book a court directly before or after one of
    // their own confirmed bookings there. Overlaps stay with bookings_no_overlap (SLOT_TAKEN);
    // other users booking right after, or the same user after a gap, are still allowed.
    // Being a constraint, it also holds when the same user sends two requests at once.
    await queryRunner.query(`
      ALTER TABLE bookings
        ADD CONSTRAINT bookings_no_back_to_back_same_user EXCLUDE USING gist (
          user_id WITH =,
          court_id WITH =,
          tstzrange(starts_at, ends_at, '[)') WITH -|-
        ) WHERE (status = 'confirmed')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE bookings DROP CONSTRAINT bookings_no_back_to_back_same_user`,
    );
  }
}
