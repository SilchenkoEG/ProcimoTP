import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { signedOut } from '../features/auth/authSlice';

interface StateWithAuth {
  auth: { token: string | null };
}

const rawBaseQuery = fetchBaseQuery({
  // Always relative: Vite's dev proxy or nginx forwards /api to the API.
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as StateWithAuth).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/**
 * A 401 on a request that carried a token means the session is invalid or expired:
 * drop it → login page. (A 401 from the login form itself — wrong password — must not,
 * or signing out would also wipe that request's error before it is shown.)
 */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const hadSession = Boolean((api.getState() as StateWithAuth).auth.token);
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && hadSession) api.dispatch(signedOut());
  return result;
};

/**
 * Every view derived from bookings. Anything that can create or cancel bookings
 * invalidates all of them, so no open screen shows stale slots, lists or revenue.
 */
export const BOOKING_VIEWS = ['Availability', 'MyBookings', 'AdminDay'] as const;

/**
 * One API slice; features add endpoints with `injectEndpoints`.
 * Tags drive refetching: e.g. creating a booking invalidates Availability and MyBookings,
 * so open screens refresh on their own.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Courts', ...BOOKING_VIEWS],
  endpoints: () => ({}),
});
