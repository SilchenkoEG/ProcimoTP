// Input normalisers for DTOs, used with class-transformer's @Transform.

type TransformInput = { value: unknown };

/** " Padel 1 " → "Padel 1". Non-strings pass through for the validators to reject. */
export const trim = ({ value }: TransformInput): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Emails are stored lower-case, so "Alice@X.com " and "alice@x.com" are one account. */
export const normalizeEmail = ({ value }: TransformInput): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
