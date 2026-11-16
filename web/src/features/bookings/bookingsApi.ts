import { baseApi } from '../../api/baseApi';
import type { Availability, Booking, MyBookings } from '../../api/types';

// Anything that changes bookings invalidates every view derived from them —
// on failure too: a 409 SLOT_TAKEN means our availability grid is stale.
const BOOKING_VIEWS = ['Availability', 'MyBookings', 'AdminDay'] as const;

export const bookingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAvailability: build.query<Availability, { courtId: string; date: string }>({
      query: ({ courtId, date }) => ({ url: `/courts/${courtId}/availability`, params: { date } }),
      providesTags: ['Availability'],
    }),
    createBooking: build.mutation<Booking, { courtId: string; startsAt: string; hours: 1 | 2 }>({
      query: (body) => ({ url: '/bookings', method: 'POST', body }),
      invalidatesTags: () => [...BOOKING_VIEWS],
    }),
    getMyBookings: build.query<MyBookings, void>({
      query: () => '/bookings/me',
      providesTags: ['MyBookings'],
    }),
    cancelBooking: build.mutation<Booking, string>({
      query: (id) => ({ url: `/bookings/${id}/cancel`, method: 'POST' }),
      invalidatesTags: () => [...BOOKING_VIEWS],
    }),
  }),
});

export const {
  useGetAvailabilityQuery,
  useCreateBookingMutation,
  useGetMyBookingsQuery,
  useCancelBookingMutation,
} = bookingsApi;
