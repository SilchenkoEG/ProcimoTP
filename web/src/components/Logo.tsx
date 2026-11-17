import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import { Box, Stack, Typography } from '@mui/material';

/** Brand mark: a green tile with a racket, plus the name. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: `${size / 4}px`,
          bgcolor: 'primary.main',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <SportsTennisIcon sx={{ fontSize: size * 0.6 }} />
      </Box>
      <Typography component="span" sx={{ fontWeight: 700, fontSize: size * 0.6, letterSpacing: '-0.02em' }}>
        Courtly
      </Typography>
    </Stack>
  );
}
