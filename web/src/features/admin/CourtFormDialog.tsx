import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { type FormEvent, useState } from 'react';
import type { Court, Sport } from '../../api/types';
import { SPORT_LABEL } from '../../lib/format';
import type { CourtInput } from './adminApi';

// Whole hours only, like the API (slots are 1 hour).
const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

const EMPTY: CourtInput = {
  name: '',
  sport: 'padel',
  priceCents: 2000,
  opensAt: '08:00',
  closesAt: '22:00',
};

/** Create (court = null) or edit a court. The parent does the API call and passes its error. */
export function CourtFormDialog({
  open,
  court,
  error,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  court: Court | null;
  error: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (input: CourtInput) => void;
}) {
  const initial = court ?? EMPTY;
  const [name, setName] = useState(initial.name);
  const [sport, setSport] = useState<Sport>(initial.sport);
  const [price, setPrice] = useState((initial.priceCents / 100).toFixed(2));
  const [opensAt, setOpensAt] = useState(initial.opensAt);
  const [closesAt, setClosesAt] = useState(initial.closesAt);

  const priceCents = Math.round(Number(price) * 100);
  const hoursInvalid = closesAt <= opensAt;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), sport, priceCents, opensAt, closesAt });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>{court ? `Edit ${court.name}` : 'New court'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              slotProps={{ htmlInput: { maxLength: 100 } }}
              autoFocus
            />
            <TextField
              select
              label="Sport"
              value={sport}
              onChange={(e) => setSport(e.target.value as Sport)}
            >
              {Object.entries(SPORT_LABEL).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Price per hour"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              slotProps={{
                htmlInput: { min: 0.01, step: 0.01 },
                input: { startAdornment: <InputAdornment position="start">€</InputAdornment> },
              }}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                fullWidth
                label="Opens"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              >
                {HOURS.map((h) => (
                  <MenuItem key={h} value={h}>
                    {h}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Closes"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                error={hoursInvalid}
                helperText={hoursInvalid ? 'Must be after opening' : ' '}
              >
                {HOURS.map((h) => (
                  <MenuItem key={h} value={h}>
                    {h}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={saving || hoursInvalid || !(priceCents > 0)}
          >
            {court ? 'Save' : 'Create court'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
