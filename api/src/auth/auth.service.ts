import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AppException, ErrorCode } from '../common/errors/app.exception.js';
import { isPgError, PG_UNIQUE_VIOLATION } from '../database/pg-errors.js';
import { User, UserRole } from '../users/user.entity.js';
import type { AuthUser, JwtPayload } from './auth-user.js';
import { BCRYPT_ROUNDS, hashPassword } from './password.js';
import type { RegisterDto } from './register.dto.js';

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

// Compared against when the email is unknown, so "no such user" and "wrong password"
// take the same time and can't be told apart (no user enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

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

    return this.session(user);
  }

  /**
   * Create a `user` account and sign it in. The role is fixed here, never taken from the
   * request (the DTO has no role field, and unknown fields are rejected).
   * Uniqueness is left to the database (`users_email_key`), so two simultaneous sign-ups
   * with the same email can't both succeed.
   */
  async register(dto: RegisterDto): Promise<{ accessToken: string; user: PublicUser }> {
    const passwordHash = await hashPassword(dto.password);
    let user: User;
    try {
      user = await this.users.save(
        this.users.create({ email: dto.email, name: dto.name, passwordHash, role: UserRole.User }),
      );
    } catch (error) {
      if (isPgError(error, PG_UNIQUE_VIOLATION, 'users_email_key')) {
        throw new AppException(
          HttpStatus.CONFLICT,
          ErrorCode.EmailTaken,
          'An account with this email already exists',
        );
      }
      throw error;
    }
    return this.session(user);
  }

  private async session(user: User): Promise<{ accessToken: string; user: PublicUser }> {
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
