import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { IconButton, Stack, TextField, Typography } from '@mui/material';
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
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
      <IconButton
        aria-label="Previous day"
        onClick={() => onChange(shiftDate(date, -1))}
        disabled={min !== undefined && date <= min}
      >
        <ChevronLeftIcon />
      </IconButton>
      <TextField
        type="date"
        size="small"
        label="Date"
        value={date}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        slotProps={{ htmlInput: { min }, inputLabel: { shrink: true } }}
      />
      <IconButton aria-label="Next day" onClick={() => onChange(shiftDate(date, 1))}>
        <ChevronRightIcon />
      </IconButton>
      <Typography color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
        {formatDateLong(date)}
      </Typography>
    </Stack>
  );
}
