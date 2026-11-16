import { HttpException, HttpStatus } from '@nestjs/common';

// Stable, machine-readable error codes. The frontend switches on these, never on messages.
export const ErrorCode = {
  ValidationFailed: 'VALIDATION_FAILED',
  Unauthenticated: 'UNAUTHENTICATED',
  InvalidCredentials: 'INVALID_CREDENTIALS',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
  InternalError: 'INTERNAL_ERROR',
  // courts
  CourtNotFound: 'COURT_NOT_FOUND',
  CourtNameTaken: 'COURT_NAME_TAKEN',
  CourtHasUpcomingBookings: 'COURT_HAS_UPCOMING_BOOKINGS',
  CourtInactive: 'COURT_INACTIVE',
  // bookings
  BookingNotFound: 'BOOKING_NOT_FOUND',
  SlotTaken: 'SLOT_TAKEN',
  BookingInPast: 'BOOKING_IN_PAST',
  InvalidStart: 'INVALID_START',
  OutsideOpeningHours: 'OUTSIDE_OPENING_HOURS',
  BookingAlreadyCancelled: 'BOOKING_ALREADY_CANCELLED',
  CancellationWindowClosed: 'CANCELLATION_WINDOW_CLOSED',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Every error the API returns on purpose. Rendered by AllExceptionsFilter as
 * `{ error: { code, message, details? } }` with the given HTTP status.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message, status);
  }
}
