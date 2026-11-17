// API response shapes. Duplicated from the API on purpose (no shared package):
// the surface is small, and it keeps web/ and api/ independent to build and run.

export type Role = 'user' | 'admin';
export type Sport = 'tennis' | 'padel' | 'squash';
export type BookingStatus = 'confirmed' | 'cancelled';
export type CancelledBy = 'user' | 'admin';
export type SlotStatus = 'available' | 'taken' | 'past';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Court {
  id: string;
  name: string;
  sport: Sport;
  priceCents: number;
  opensAt: string; // "08:00"
  closesAt: string; // "23:00"
  isActive: boolean;
}

export interface Slot {
  time: string; // "08:00"
  startsAt: string;
  endsAt: string;
  status: SlotStatus;
}

export interface Availability {
  courtId: string;
  date: string;
  timezone: string;
  opensAt: string;
  closesAt: string;
  priceCents: number;
  slots: Slot[];
}

export interface Booking {
  id: string;
  court: { id: string; name: string; sport: Sport };
  startsAt: string;
  endsAt: string;
  hours: number;
  priceCents: number;
  status: BookingStatus;
  cancelledAt: string | null;
  cancelledBy: CancelledBy | null;
  canCancel: boolean;
}

export interface MyBookings {
  upcoming: Booking[];
  past: Booking[];
}

export interface AdminDayBooking extends Omit<Booking, 'canCancel' | 'cancelledAt'> {
  user: { id: string; name: string; email: string };
}

export interface AdminDayView {
  date: string;
  timezone: string;
  totalRevenueCents: number;
  confirmedCount: number;
  cancelledCount: number;
  bookings: AdminDayBooking[];
}

/** Every API error: `{ error: { code, message, details? } }`. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
