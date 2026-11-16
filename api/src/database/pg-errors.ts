import { QueryFailedError } from 'typeorm';

// Postgres SQLSTATE codes we turn into specific API errors.
export const PG_UNIQUE_VIOLATION = '23505';
export const PG_EXCLUSION_VIOLATION = '23P01';

/** True when a query failed with the given SQLSTATE (and optionally the given constraint). */
export function isPgError(error: unknown, code: string, constraint?: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as { code?: string; constraint?: string };
  return driverError.code === code && (!constraint || driverError.constraint === constraint);
}
