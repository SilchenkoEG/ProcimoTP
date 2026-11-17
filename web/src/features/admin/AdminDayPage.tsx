import EuroIcon from '@mui/icons-material/Euro';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import {
  alpha,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { DateNavigator } from '../../components/DateNavigator';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { SportAvatar } from '../../components/SportAvatar';
import { facilityToday, formatPrice, formatTime, SPORT_LABEL } from '../../lib/format';
import { useGetDayViewQuery } from './adminApi';

function Stat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box
          sx={{ width: 44, height: 44, borderRadius: '10px', display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.1), color }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography component="p" sx={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export function AdminDayPage() {
  const [params, setParams] = useSearchParams();
  const date = params.get('date') ?? facilityToday();
  const { data, isLoading, error } = useGetDayViewQuery(date, { refetchOnFocus: true });

  return (
    <>
      <PageHeader title="Bookings by day" subtitle="Every booking on the selected day, with expected revenue." />

      <DateNavigator date={date} onChange={(next) => setParams({ date: next })} />

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stat
                  label="Expected revenue"
                  value={formatPrice(data.totalRevenueCents)}
                  icon={<EuroIcon />}
                  color="#1b6b4a"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Stat
                  label="Confirmed"
                  value={data.confirmedCount}
                  icon={<EventAvailableIcon />}
                  color="#2563eb"
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Stat
                  label="Cancelled"
                  value={data.cancelledCount}
                  icon={<EventBusyIcon />}
                  color="#b45309"
                />
              </Grid>
            </Grid>

            {data.bookings.length === 0 ? (
              <Card sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">No bookings on this day.</Typography>
              </Card>
            ) : (
              <TableContainer component={Card}>
                <Table size="small" aria-label="Bookings">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Court</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.bookings.map((b) => {
                      const cancelled = b.status === 'cancelled';
                      return (
                        <TableRow key={b.id} sx={{ opacity: cancelled ? 0.55 : 1 }}>
                          <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {formatTime(b.startsAt)}–{formatTime(b.endsAt)}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                              <SportAvatar sport={b.court.sport} size={28} />
                              <span>
                                {b.court.name}
                                <Typography variant="body2" color="text.secondary">
                                  {SPORT_LABEL[b.court.sport]}
                                </Typography>
                              </span>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            {b.user.name}
                            <Typography variant="body2" color="text.secondary">
                              {b.user.email}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 600, textDecoration: cancelled ? 'line-through' : 'none' }}
                          >
                            {formatPrice(b.priceCents)}
                          </TableCell>
                          <TableCell>
                            {cancelled ? (
                              <Chip
                                size="small"
                                label={b.cancelledBy === 'admin' ? 'Cancelled by admin' : 'Cancelled by user'}
                              />
                            ) : (
                              <Chip size="small" color="success" label="Confirmed" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </QueryState>
    </>
  );
}
