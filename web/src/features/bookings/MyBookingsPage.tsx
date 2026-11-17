import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '../../api/errors';
import type { Booking } from '../../api/types';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { SportAvatar } from '../../components/SportAvatar';
import { formatDateParts, formatPrice, formatRange, formatTime, SPORT_LABEL } from '../../lib/format';
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

/** Calendar-style tile: month, day number, weekday. */
function DateTile({ month, day, weekday, muted }: { month: string; day: string; weekday: string; muted: boolean }) {
  return (
    <Box
      sx={{
        width: 60,
        flexShrink: 0,
        textAlign: 'center',
        borderRadius: '10px',
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        opacity: muted ? 0.6 : 1,
      }}
    >
      <Box sx={{ bgcolor: muted ? 'grey.400' : 'primary.main', color: '#fff', fontSize: 11, fontWeight: 700, py: 0.25, textTransform: 'uppercase' }}>
        {month}
      </Box>
      <Box sx={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, pt: 0.5 }}>{day}</Box>
      <Box sx={{ fontSize: 11, color: 'text.secondary', pb: 0.5 }}>{weekday}</Box>
    </Box>
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
      <PageHeader title="My bookings" subtitle="Bookings can be cancelled up to 2 hours before they start." />

      <Tabs value={tab} onChange={(_, value: 'upcoming' | 'past') => setTab(value)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="upcoming" label={`Upcoming (${data?.upcoming.length ?? 0})`} />
        <Tab value="past" label={`Past (${data?.past.length ?? 0})`} />
      </Tabs>

      <QueryState isLoading={isLoading} error={error}>
        <Stack spacing={1.5}>
          {list.length === 0 && (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {tab === 'upcoming' ? 'No upcoming bookings.' : 'No past bookings yet.'}
              </Typography>
              {tab === 'upcoming' && (
                <Button component={Link} to="/courts" variant="contained" sx={{ mt: 2 }}>
                  Book a court
                </Button>
              )}
            </Card>
          )}
          {list.map((b) => {
            const date = formatDateParts(b.startsAt);
            const cancelled = b.status === 'cancelled';
            return (
              <Card key={b.id}>
                <CardContent
                  sx={{ display: 'flex', gap: 2.5, alignItems: 'center', flexWrap: 'wrap', p: 2, '&:last-child': { pb: 2 } }}
                >
                  <DateTile {...date} muted={cancelled} />
                  <Stack sx={{ flexGrow: 1, minWidth: 200, opacity: cancelled ? 0.6 : 1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <SportAvatar sport={b.court.sport} size={24} />
                      <Typography sx={{ fontWeight: 600 }}>{b.court.name}</Typography>
                      <Typography color="text.secondary">· {SPORT_LABEL[b.court.sport]}</Typography>
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatTime(b.startsAt)}–{formatTime(b.endsAt)} · {b.hours} h ·{' '}
                      <Box
                        component="span"
                        sx={{ fontWeight: 600, color: 'text.primary', textDecoration: cancelled ? 'line-through' : 'none' }}
                      >
                        {formatPrice(b.priceCents)}
                      </Box>
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
            );
          })}
        </Stack>
      </QueryState>

      <ConfirmDialog
        open={toCancel !== null}
        title="Cancel this booking?"
        error={cancel.error ? errorMessage(cancel.error) : null}
        cancelLabel="Keep booking"
        confirmLabel="Cancel booking"
        busy={cancel.isLoading}
        onCancel={() => setToCancel(null)}
        onConfirm={confirmCancel}
      >
        {toCancel && `${toCancel.court.name}, ${formatRange(toCancel.startsAt, toCancel.endsAt)}.`}
      </ConfirmDialog>
    </>
  );
}
