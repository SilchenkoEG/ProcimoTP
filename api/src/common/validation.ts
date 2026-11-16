import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';
import { ValidateBy } from 'class-validator';
import { AppException, ErrorCode } from './errors/app.exception.js';
import { isValidDate } from './facility-time.js';

/** A real calendar date in strict YYYY-MM-DD form ("2030-02-30" is rejected). */
export function IsCalendarDate(): PropertyDecorator {
  return ValidateBy({
    name: 'isCalendarDate',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && isValidDate(value),
      defaultMessage: () => '$property must be a valid calendar date in YYYY-MM-DD format',
    },
  });
}

/** `?date=YYYY-MM-DD` — a facility-local calendar day. */
export class DateQuery {
  @IsCalendarDate()
  date: string;
}

function flatten(errors: ValidationError[], parent = ''): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    if (e.children?.length) Object.assign(out, flatten(e.children, path));
  }
  return out;
}

/** Global DTO validation: unknown fields are rejected, values are converted to DTO types. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.ValidationFailed,
        'Request validation failed',
        flatten(errors), // e.g. { "email": ["email must be an email"] }
      ),
  });
}
