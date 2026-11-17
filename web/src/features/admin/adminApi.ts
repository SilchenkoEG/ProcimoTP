import { BOOKING_VIEWS, baseApi } from '../../api/baseApi';
import type { AdminDayView, Court, Sport } from '../../api/types';

export interface CourtInput {
  name: string;
  sport: Sport;
  priceCents: number;
  opensAt: string;
  closesAt: string;
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDayView: build.query<AdminDayView, string>({
      query: (date) => ({ url: '/admin/bookings', params: { date } }),
      providesTags: ['AdminDay'],
    }),
    getAdminCourts: build.query<Court[], void>({
      query: () => '/admin/courts',
      providesTags: ['Courts'],
    }),
    createCourt: build.mutation<Court, CourtInput>({
      query: (body) => ({ url: '/admin/courts', method: 'POST', body }),
      invalidatesTags: ['Courts'],
    }),
    updateCourt: build.mutation<
      Court,
      {
        id: string;
        changes: Partial<CourtInput> & { isActive?: boolean };
        /** Second step of the confirm flow: apply and cancel the affected bookings. */
        cancelAffectedBookings?: boolean;
      }
    >({
      query: ({ id, changes, cancelAffectedBookings }) => ({
        url: `/admin/courts/${id}`,
        method: 'PATCH',
        body: changes,
        params: cancelAffectedBookings ? { cancelAffectedBookings: true } : undefined,
      }),
      // Hours/active changes can cancel bookings, so every booking view may be stale.
      invalidatesTags: (result) =>
        result ? ['Courts', ...BOOKING_VIEWS] : [],
    }),
  }),
});

export const {
  useGetDayViewQuery,
  useGetAdminCourtsQuery,
  useCreateCourtMutation,
  useUpdateCourtMutation,
} = adminApi;
