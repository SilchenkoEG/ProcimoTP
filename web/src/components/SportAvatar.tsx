import SportsTennisIcon from '@mui/icons-material/SportsTennis';
import { alpha, Box } from '@mui/material';
import type { Sport } from '../api/types';

/** One accent colour per sport, so courts are easy to tell apart at a glance. */
const SPORT_COLOR: Record<Sport, string> = {
  padel: '#2563eb',
  tennis: '#c2410c',
  squash: '#7c3aed',
};

export function SportAvatar({ sport, size = 40 }: { sport: Sport; size?: number }) {
  const color = SPORT_COLOR[sport];
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: `${size / 4}px`,
        bgcolor: alpha(color, 0.1),
        color,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <SportsTennisIcon sx={{ fontSize: size * 0.55 }} />
    </Box>
  );
}
