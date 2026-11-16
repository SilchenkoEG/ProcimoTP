import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import type { JwtPayload } from './auth-user.js';
import { type AuthenticatedRequest, IS_PUBLIC_KEY } from './decorators.js';

/**
 * Registered globally (APP_GUARD): every route requires a valid Bearer token
 * unless marked @Public(). Secure by default — a new route can't be forgotten.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.Unauthenticated,
        'Missing bearer token',
      );
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.Unauthenticated,
        'Invalid or expired token',
      );
    }
    return true;
  }
}
