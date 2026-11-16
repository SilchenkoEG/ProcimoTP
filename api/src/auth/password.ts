import bcrypt from 'bcryptjs';

/** bcrypt cost factor, shared by sign-up and the seed. */
export const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
