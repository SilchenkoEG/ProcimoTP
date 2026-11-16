import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  // Stored lower-case, like at login, so "Alice@X.com" and "alice@x.com" are one account.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(255)
  email: string;

  // bcrypt only uses the first 72 bytes, so longer passwords are refused rather than truncated.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
