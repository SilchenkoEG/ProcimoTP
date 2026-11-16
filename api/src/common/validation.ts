import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';
import { AppException, ErrorCode } from './errors/app.exception.js';

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
