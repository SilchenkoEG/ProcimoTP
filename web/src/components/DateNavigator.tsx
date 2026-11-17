import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { IconButton, Paper, Stack, TextField, Typography } from '@mui/material';
import { formatDateLong, shiftDate } from '../lib/format';

/** Previous day · date picker · next day, for a YYYY-MM-DD date. `min` blocks earlier dates. */
export function DateNavigator({
  date,
  onChange,
  min,
}: {
  date: string;
  onChange: (date: string) => void;
  min?: string;
}) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3, flexWrap: 'wrap', rowGap: 1 }}>
      <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 0.5, gap: 0.5 }}>
        <IconButton
          size="small"
          aria-label="Previous day"
          onClick={() => onChange(shiftDate(date, -1))}
          disabled={min !== undefined && date <= min}
        >
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          type="date"
          size="small"
          variant="standard"
          value={date}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          slotProps={{ htmlInput: { min, 'aria-label': 'Date' }, input: { disableUnderline: true } }}
          sx={{ '& input': { fontWeight: 600, px: 1 } }}
        />
        <IconButton size="small" aria-label="Next day" onClick={() => onChange(shiftDate(date, 1))}>
          <ChevronRightIcon />
        </IconButton>
      </Paper>
      <Typography sx={{ fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
        {formatDateLong(date)}
      </Typography>
    </Stack>
  );
}
