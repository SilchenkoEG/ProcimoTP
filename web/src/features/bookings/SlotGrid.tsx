import { Box, Button } from '@mui/material';
import type { Slot } from '../../api/types';
import { isSlotSelected } from './slotSelection';

const LABEL: Record<Slot['status'], string> = {
  available: 'Free',
  taken: 'Taken',
  past: 'Past',
};

/** The day's hourly slots. Only `available` slots can be clicked. */
export function SlotGrid({
  slots,
  selectedStart,
  hours,
  onSelect,
}: {
  slots: Slot[];
  selectedStart: string | null;
  hours: 1 | 2;
  onSelect: (startsAt: string) => void;
}) {
  return (
    <Box
      role="list"
      aria-label="Time slots"
      sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}
    >
      {slots.map((slot, i) => {
        const selected = isSlotSelected(slots, i, selectedStart, hours);
        return (
          <Button
            key={slot.startsAt}
            role="listitem"
            aria-pressed={selected}
            aria-label={`${slot.time} ${LABEL[slot.status]}`}
            disabled={slot.status !== 'available'}
            variant={selected ? 'contained' : 'outlined'}
            color={slot.status === 'taken' ? 'error' : 'primary'}
            onClick={() => onSelect(slot.startsAt)}
            sx={{
              flexDirection: 'column',
              py: 1,
              // Make "taken" readable even though the button is disabled.
              '&.Mui-disabled': slot.status === 'taken'
                ? { color: 'error.main', borderColor: 'error.light', bgcolor: 'rgba(211,47,47,0.06)' }
                : {},
            }}
          >
            <Box component="span" sx={{ fontWeight: 600 }}>
              {slot.time}
            </Box>
            <Box component="span" sx={{ fontSize: 12 }}>
              {selected ? 'Selected' : LABEL[slot.status]}
            </Box>
          </Button>
        );
      })}
    </Box>
  );
}
