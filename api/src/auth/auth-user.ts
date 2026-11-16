import type { UserRole } from '../users/user.entity.js';

/** What the JWT carries. `sub` is the user id (standard JWT claim). */
export interface JwtPayload {
  sub: string;
  role: UserRole;
}

/** The authenticated caller, attached to the request by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: UserRole;
}
