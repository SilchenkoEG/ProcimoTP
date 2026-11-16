import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { AuthUser } from './auth-user.js';
import { AuthService, type PublicUser } from './auth.service.js';
import { CurrentUser, Public } from './decorators.js';
import { LoginDto } from './login.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK) // a login creates no resource, so 200 rather than 201
  login(@Body() dto: LoginDto): Promise<{ accessToken: string; user: PublicUser }> {
    return this.auth.login(dto.email, dto.password);
  }

  /** The frontend calls this on page load to restore the session from a stored token. */
  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<PublicUser> {
    return this.auth.me(user);
  }
}
