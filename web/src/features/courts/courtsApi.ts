import { baseApi } from '../../api/baseApi';
import type { Court } from '../../api/types';

export const courtsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCourts: build.query<Court[], void>({
      query: () => '/courts',
      providesTags: ['Courts'],
    }),
    getCourt: build.query<Court, string>({
      query: (id) => `/courts/${id}`,
      providesTags: ['Courts'],
    }),
  }),
});

export const { useGetCourtsQuery, useGetCourtQuery } = courtsApi;
