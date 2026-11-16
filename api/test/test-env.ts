// Integration tests run against a real Postgres (the compose `db` service), in their own
// database. Override with TEST_DATABASE_URL, e.g. in CI.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://courtly:courtly@localhost:5433/courtly_test';
