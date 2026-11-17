import {
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router';
import { DateNavigator } from '../../components/DateNavigator';
import { QueryState } from '../../components/QueryState';
import { facilityToday, formatPrice, formatTime, SPORT_LABEL } from '../../lib/format';
import { useGetDayViewQuery } from './adminApi';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" component="p" sx={{ fontWeight: 600 }}>
          {value}
        </Typography>
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
      <Typography variant="h5" component="h1" gutterBottom>
        Bookings by day
      </Typography>

      <DateNavigator date={date} onChange={(next) => setParams({ date: next })} />

      <QueryState isLoading={isLoading} error={error}>
        {data && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Stat label="Expected revenue" value={formatPrice(data.totalRevenueCents)} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Stat label="Confirmed bookings" value={data.confirmedCount} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Stat label="Cancelled" value={data.cancelledCount} />
              </Grid>
            </Grid>

            {data.bookings.length === 0 ? (
              <Typography color="text.secondary">No bookings on this day.</Typography>
            ) : (
              <TableContainer component={Paper}>
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
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {formatTime(b.startsAt)}–{formatTime(b.endsAt)}
                          </TableCell>
                          <TableCell>
                            {b.court.name}
                            <Typography component="span" variant="body2" color="text.secondary">
                              {' '}
                              · {SPORT_LABEL[b.court.sport]}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {b.user.name}
                            <Typography variant="body2" color="text.secondary">
                              {b.user.email}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ textDecoration: cancelled ? 'line-through' : 'none' }}
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
