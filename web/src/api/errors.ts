import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';
import type { ApiErrorBody } from './types';

type RtkError = FetchBaseQueryError | SerializedError | undefined;

function apiError(error: RtkError): ApiErrorBody['error'] | undefined {
  if (error && 'status' in error && typeof error.data === 'object' && error.data !== null) {
    return (error.data as Partial<ApiErrorBody>).error;
  }
  return undefined;
}

/** The API's machine-readable error code, e.g. "SLOT_TAKEN". */
export function errorCode(error: RtkError): string | undefined {
  return apiError(error)?.code;
}

/** A message that is safe to show to the user. */
export function errorMessage(error: RtkError): string {
  const body = apiError(error);
  if (body) {
    if (body.code === 'VALIDATION_FAILED' && body.details && typeof body.details === 'object') {
      return Object.values(body.details as Record<string, string[]>).flat().join('. ');
    }
    return body.message;
  }
  if (error && 'status' in error && error.status === 'FETCH_ERROR') {
    return 'Cannot reach the server. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
