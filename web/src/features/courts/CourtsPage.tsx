import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { Link } from 'react-router';
import { QueryState } from '../../components/QueryState';
import { formatPrice, SPORT_LABEL } from '../../lib/format';
import { useGetCourtsQuery } from './courtsApi';

export function CourtsPage() {
  const { data: courts, isLoading, error } = useGetCourtsQuery();

  return (
    <>
      <Typography variant="h5" component="h1" gutterBottom>
        Courts
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Pick a court to see its free time slots.
      </Typography>

      <QueryState isLoading={isLoading} error={error}>
        <Grid container spacing={2}>
          {courts?.map((court) => (
            <Grid key={court.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardActionArea component={Link} to={`/courts/${court.id}`}>
                  <CardContent>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{court.name}</Typography>
                      <Chip label={SPORT_LABEL[court.sport]} size="small" />
                    </Stack>
                    <Typography sx={{ fontWeight: 600 }}>
                      {formatPrice(court.priceCents)} / hour
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1 }}>
                      <ScheduleIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Open {court.opensAt}–{court.closesAt}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        {courts?.length === 0 && <Typography>No courts are open for booking.</Typography>}
      </QueryState>
    </>
  );
}
