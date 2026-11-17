import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { errorCode, errorMessage } from '../../api/errors';
import type { Booking } from '../../api/types';
import { DateNavigator } from '../../components/DateNavigator';
import { QueryState } from '../../components/QueryState';
import { facilityToday, formatPrice, formatRange, SPORT_LABEL } from '../../lib/format';
import { useGetCourtQuery } from '../courts/courtsApi';
import { useCreateBookingMutation, useGetAvailabilityQuery } from './bookingsApi';
import { SlotGrid } from './SlotGrid';
import { canBookTwoHours } from './slotSelection';

export function CourtAvailabilityPage() {
  const { courtId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const today = facilityToday();
  const date = params.get('date') ?? today;

  const court = useGetCourtQuery(courtId, { refetchOnFocus: true }); // hours can change
  const availability = useGetAvailabilityQuery(
    { courtId, date },
    // Not real-time, but re-checks every 30 s and when the tab regains focus.
    { pollingInterval: 30_000, refetchOnFocus: true },
  );
  const [createBooking, booking] = useCreateBookingMutation();

  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [hours, setHours] = useState<1 | 2>(1);
  const [booked, setBooked] = useState<Booking | null>(null);

  const slots = availability.data?.slots ?? [];
  const startIndex = slots.findIndex((s) => s.startsAt === selectedStart);
  // A refresh can drop the selected slot (an admin changed the hours or closed the court),
  // or take the hour after it. The selection then shrinks or disappears instead of
  // pointing at a slot that isn't there.
  const selection = startIndex === -1 ? null : { start: slots[startIndex], index: startIndex };
  const twoHoursPossible = selection !== null && canBookTwoHours(slots, selection.index);
  const effectiveHours = twoHoursPossible ? hours : 1;

  const changeDate = (next: string) => {
    setParams({ date: next < today ? today : next });
    setSelectedStart(null);
    setHours(1);
    booking.reset();
  };

  const select = (startsAt: string) => {
    setSelectedStart(startsAt === selectedStart ? null : startsAt);
    setHours(1);
    setBooked(null);
    booking.reset();
  };

  const book = async () => {
    if (!selection) return;
    const result = await createBooking({
      courtId,
      startsAt: selection.start.startsAt,
      hours: effectiveHours,
    });
    if (result.data) {
      setBooked(result.data);
      setSelectedStart(null);
      setHours(1);
    } else if (errorCode(result.error) === 'SLOT_TAKEN') {
      // Someone was faster; the grid refetches (tag invalidation), so drop the stale choice.
      setSelectedStart(null);
    }
  };

  return (
    <>
      <Button component={Link} to="/courts" startIcon={<ArrowBackIcon />} sx={{ mb: 1 }}>
        All courts
      </Button>

      <QueryState isLoading={court.isLoading} error={court.error}>
        {court.data && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="h5" component="h1">
              {court.data.name}
            </Typography>
            <Chip label={SPORT_LABEL[court.data.sport]} size="small" />
            <Typography color="text.secondary">
              {formatPrice(court.data.priceCents)} / hour · open {court.data.opensAt}–
              {court.data.closesAt}
            </Typography>
          </Stack>
        )}
      </QueryState>

      <DateNavigator date={date} onChange={changeDate} min={today} />

      {booked && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button component={Link} to="/bookings" color="inherit" size="small">
              My bookings
            </Button>
          }
        >
          Booked {booked.court.name}: {formatRange(booked.startsAt, booked.endsAt)} (
          {formatPrice(booked.priceCents)}).
        </Alert>
      )}
      {booking.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage(booking.error)}
        </Alert>
      )}

      <QueryState isLoading={availability.isLoading} error={availability.error}>
        {slots.length === 0 ? (
          <Typography>This court has no slots on this day.</Typography>
        ) : (
          <SlotGrid
            slots={slots}
            selectedStart={selection?.start.startsAt ?? null}
            hours={effectiveHours}
            onSelect={select}
          />
        )}
      </QueryState>

      {selection && availability.data && (
        <Paper
          elevation={3}
          sx={{ position: 'sticky', bottom: 16, mt: 3, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            value={effectiveHours}
            onChange={(_, value: 1 | 2 | null) => value && setHours(value)}
            aria-label="Duration"
          >
            <ToggleButton value={1}>1 hour</ToggleButton>
            <ToggleButton value={2} disabled={!twoHoursPossible}>
              2 hours
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography sx={{ flexGrow: 1 }}>
            {formatRange(
              selection.start.startsAt,
              slots[selection.index + effectiveHours - 1].endsAt,
            )}{' '}
            · <strong>{formatPrice(availability.data.priceCents * effectiveHours)}</strong>
          </Typography>
          <Button variant="contained" onClick={book} disabled={booking.isLoading}>
            {booking.isLoading ? 'Booking…' : 'Book'}
          </Button>
        </Paper>
      )}
    </>
  );
}
