import { baseApi } from '../../api/baseApi';
import type { LoginResponse } from '../../api/types';
import { signedIn } from './authSlice';

type SessionQueryLifecycle = {
  dispatch: (action: ReturnType<typeof signedIn>) => unknown;
  queryFulfilled: Promise<{ data: LoginResponse }>;
};

/** Login and sign-up both return a session; storing it lives here, not in each page. */
async function startSession(_: unknown, { dispatch, queryFulfilled }: SessionQueryLifecycle) {
  try {
    const { data } = await queryFulfilled;
    dispatch(signedIn({ token: data.accessToken, user: data.user }));
  } catch {
    // The page shows the mutation's error; nothing to store.
  }
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: startSession,
    }),
    register: build.mutation<LoginResponse, { name: string; email: string; password: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      onQueryStarted: startSession,
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
