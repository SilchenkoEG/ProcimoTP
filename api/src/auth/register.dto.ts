import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail, trim } from '../common/transforms.js';

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(normalizeEmail)
  @IsEmail()
  @MaxLength(255)
  email: string;

  // bcrypt only uses the first 72 bytes, so longer passwords are refused rather than truncated.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
