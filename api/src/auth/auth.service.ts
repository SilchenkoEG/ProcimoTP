import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import { User, UserRole } from '../users/user.entity.js';
import type { AuthUser, JwtPayload } from './auth-user.js';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Compared against when the email is unknown, so "no such user" and "wrong password"
// take the same time and can't be told apart (no user enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string; user: PublicUser }> {
    // passwordHash is `select: false` on the entity, so it must be requested explicitly.
    const user = await this.users.findOne({
      where: { email },
      select: { id: true, email: true, name: true, role: true, passwordHash: true },
    });
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) {
      // One message for both cases — don't reveal which emails exist.
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.InvalidCredentials,
        'Invalid email or password',
      );
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), user: toPublicUser(user) };
  }

  async me(authUser: AuthUser): Promise<PublicUser> {
    const user = await this.users.findOneBy({ id: authUser.id });
    if (!user) {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        ErrorCode.Unauthenticated,
        'User no longer exists',
      );
    }
    return toPublicUser(user);
  }
}

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
