import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { Sport } from '../api/types';

dayjs.extend(utc);
dayjs.extend(timezone);

/** Times are always shown in the facility's zone, whatever the viewer's device zone is. */
export const FACILITY_TIMEZONE = 'Europe/Lisbon';

const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
export const formatPrice = (cents: number) => eur.format(cents / 100);

const local = (iso: string) => dayjs(iso).tz(FACILITY_TIMEZONE);
export const formatTime = (iso: string) => local(iso).format('HH:mm');
export const formatDay = (iso: string) => local(iso).format('ddd D MMM YYYY');
export const formatRange = (startIso: string, endIso: string) =>
  `${formatDay(startIso)}, ${formatTime(startIso)}–${formatTime(endIso)}`;

/** Facility-local calendar dates as YYYY-MM-DD (the API's `?date=` format). */
export const facilityToday = () => dayjs().tz(FACILITY_TIMEZONE).format('YYYY-MM-DD');
export const shiftDate = (date: string, days: number) =>
  dayjs(date).add(days, 'day').format('YYYY-MM-DD');
export const formatDateLong = (date: string) => dayjs(date).format('dddd D MMMM YYYY');

export const SPORT_LABEL: Record<Sport, string> = {
  padel: 'Padel',
  tennis: 'Tennis',
  squash: 'Squash',
};
