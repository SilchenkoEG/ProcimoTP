import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorMessage } from '../../api/errors';
import type { Booking } from '../../api/types';
import { QueryState } from '../../components/QueryState';
import { formatPrice, formatRange, SPORT_LABEL } from '../../lib/format';
import { useCancelBookingMutation, useGetMyBookingsQuery } from './bookingsApi';

function StatusChip({ booking }: { booking: Booking }) {
  if (booking.status === 'confirmed') return <Chip label="Confirmed" color="success" size="small" />;
  return (
    <Chip
      label={booking.cancelledBy === 'admin' ? 'Cancelled by facility' : 'Cancelled'}
      size="small"
    />
  );
}

export function MyBookingsPage() {
  const { data, isLoading, error } = useGetMyBookingsQuery();
  const [cancelBooking, cancel] = useCancelBookingMutation();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [toCancel, setToCancel] = useState<Booking | null>(null);

  const list = data?.[tab] ?? [];

  const confirmCancel = async () => {
    if (!toCancel) return;
    const result = await cancelBooking(toCancel.id);
    if (!result.error) setToCancel(null);
  };

  return (
    <>
      <Typography variant="h5" component="h1" gutterBottom>
        My bookings
      </Typography>

      <Tabs value={tab} onChange={(_, value: 'upcoming' | 'past') => setTab(value)} sx={{ mb: 2 }}>
        <Tab value="upcoming" label={`Upcoming (${data?.upcoming.length ?? 0})`} />
        <Tab value="past" label={`Past (${data?.past.length ?? 0})`} />
      </Tabs>

      <QueryState isLoading={isLoading} error={error}>
        <Stack spacing={1.5}>
          {list.length === 0 && (
            <Typography color="text.secondary">
              {tab === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings yet.'}
            </Typography>
          )}
          {list.map((b) => (
            <Card key={b.id} sx={{ opacity: b.status === 'cancelled' ? 0.65 : 1 }}>
              <CardContent
                sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', '&:last-child': { pb: 2 } }}
              >
                <Stack sx={{ flexGrow: 1, minWidth: 220 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {b.court.name}{' '}
                    <Typography component="span" color="text.secondary">
                      · {SPORT_LABEL[b.court.sport]}
                    </Typography>
                  </Typography>
                  <Typography color="text.secondary">
                    {formatRange(b.startsAt, b.endsAt)} · {b.hours} h · {formatPrice(b.priceCents)}
                  </Typography>
                </Stack>
                <StatusChip booking={b} />
                {tab === 'upcoming' && b.status === 'confirmed' && (
                  // canCancel is a UI hint; the API re-checks the 2 h rule on every cancel.
                  <Tooltip
                    title={b.canCancel ? '' : 'Bookings can only be cancelled up to 2 hours before they start'}
                  >
                    <span>
                      <Button
                        color="error"
                        variant="outlined"
                        size="small"
                        disabled={!b.canCancel}
                        onClick={() => {
                          cancel.reset();
                          setToCancel(b);
                        }}
                      >
                        Cancel
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      </QueryState>

      <Dialog open={toCancel !== null} onClose={() => setToCancel(null)}>
        <DialogTitle>Cancel this booking?</DialogTitle>
        <DialogContent>
          {toCancel && (
            <DialogContentText>
              {toCancel.court.name}, {formatRange(toCancel.startsAt, toCancel.endsAt)}.
            </DialogContentText>
          )}
          {cancel.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage(cancel.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToCancel(null)}>Keep booking</Button>
          <Button color="error" variant="contained" onClick={confirmCancel} disabled={cancel.isLoading}>
            Cancel booking
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
