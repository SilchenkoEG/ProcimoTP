// Runs once before the integration suite: makes sure the separate test database exists,
// so tests never touch the dev/demo data in `courtly`. Migrations run when the app boots.
import pg from 'pg';
import { TEST_DATABASE_URL } from './test-env.js';

export default async function globalSetup(): Promise<void> {
  const target = new URL(TEST_DATABASE_URL);
  const dbName = target.pathname.slice(1);
  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = '/postgres';

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      dbName,
    ]);
    if (!rowCount) await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await client.end();
  }
}
