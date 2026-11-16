import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException, ErrorCode } from './app.exception.js';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

// Codes for Nest's built-in exceptions (e.g. unknown route → NotFoundException).
const CODE_BY_STATUS: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.ValidationFailed,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.Unauthenticated,
  [HttpStatus.FORBIDDEN]: ErrorCode.Forbidden,
  [HttpStatus.NOT_FOUND]: ErrorCode.NotFound,
};

/** One error shape for the whole API: `{ error: { code, message, details? } }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const [status, body] = this.toErrorBody(exception);
    response.status(status).json({ error: body });
  }

  private toErrorBody(exception: unknown): [number, ErrorBody] {
    if (exception instanceof AppException) {
      return [
        exception.getStatus(),
        { code: exception.code, message: exception.message, details: exception.details },
      ];
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return [
        status,
        { code: CODE_BY_STATUS[status] ?? `HTTP_${status}`, message: exception.message },
      ];
    }
    // Anything else is a bug: log the details, never leak them to the client.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return [
      HttpStatus.INTERNAL_SERVER_ERROR,
      { code: ErrorCode.InternalError, message: 'Unexpected server error' },
    ];
  }
}
