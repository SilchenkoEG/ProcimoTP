import { baseApi } from '../../api/baseApi';
import type { LoginResponse } from '../../api/types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<LoginResponse, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: build.mutation<LoginResponse, { name: string; email: string; password: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation } = authApi;
