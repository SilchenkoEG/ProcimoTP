import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import type { UserRole } from '../users/user.entity.js';
import { type AuthenticatedRequest, ROLES_KEY } from './decorators.js';

/**
 * Registered globally after JwtAuthGuard. Routes without @Roles() are open to any
 * authenticated user; routes with @Roles(...) require one of the listed roles.
 * This is the API-side role separation the brief asks for — hiding UI is not enough.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!user || !roles.includes(user.role)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        ErrorCode.Forbidden,
        'You do not have permission to do this',
      );
    }
    return true;
  }
}
