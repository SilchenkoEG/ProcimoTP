import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Box, Card, CardActionArea, CardContent, Grid, Stack, Typography } from '@mui/material';
import { Link } from 'react-router';
import { PageHeader } from '../../components/PageHeader';
import { QueryState } from '../../components/QueryState';
import { SportAvatar } from '../../components/SportAvatar';
import { formatPrice, SPORT_LABEL } from '../../lib/format';
import { useGetCourtsQuery } from './courtsApi';

export function CourtsPage() {
  const { data: courts, isLoading, error } = useGetCourtsQuery();

  return (
    <>
      <PageHeader title="Courts" subtitle="Pick a court to see its free time slots." />

      <QueryState isLoading={isLoading} error={error}>
        <Grid container spacing={2.5}>
          {courts?.map((court) => (
            <Grid key={court.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'border-color 150ms, box-shadow 150ms, transform 150ms',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: '0 8px 24px rgba(20, 33, 27, 0.08)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                <CardActionArea component={Link} to={`/courts/${court.id}`} sx={{ height: '100%' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
                      <SportAvatar sport={court.sport} size={44} />
                      <Box>
                        <Typography variant="h6" component="h2" sx={{ lineHeight: 1.2 }}>
                          {court.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {SPORT_LABEL[court.sport]}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {formatPrice(court.priceCents)}
                      <Typography component="span" color="text.secondary" sx={{ fontSize: 15, fontWeight: 500 }}>
                        {' '}
                        / hour
                      </Typography>
                    </Typography>
                    <Stack
                      direction="row"
                      sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 2.5, pt: 2, borderTop: 1, borderColor: 'divider' }}
                    >
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                        <ScheduleIcon sx={{ fontSize: 18 }} color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {court.opensAt}–{court.closesAt}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'primary.main' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          See times
                        </Typography>
                        <ArrowForwardIcon sx={{ fontSize: 18 }} />
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
        {courts?.length === 0 && (
          <Typography color="text.secondary">No courts are open for booking.</Typography>
        )}
      </QueryState>
    </>
  );
}
