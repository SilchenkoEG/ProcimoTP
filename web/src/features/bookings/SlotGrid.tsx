import { alpha, Box, Button, Stack, Typography } from '@mui/material';
import type { Slot } from '../../api/types';
import { isSlotSelected } from './slotSelection';

const LABEL: Record<Slot['status'], string> = {
  available: 'Free',
  taken: 'Booked',
  past: 'Past',
};

/** Morning / afternoon / evening, by the slot's start hour in the facility's zone. */
const PARTS = [
  { label: 'Morning', from: 0, to: 12 },
  { label: 'Afternoon', from: 12, to: 17 },
  { label: 'Evening', from: 17, to: 24 },
];

/** The day's hourly slots, grouped by part of day. Only `available` slots can be clicked. */
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
  // Keep each slot's index in the full list: selection works on the whole day.
  const indexed = slots.map((slot, index) => ({ slot, index, hour: Number(slot.time.slice(0, 2)) }));

  return (
    <Stack spacing={3}>
      {PARTS.map((part) => {
        const inPart = indexed.filter((s) => s.hour >= part.from && s.hour < part.to);
        if (inPart.length === 0) return null;
        return (
          <Box key={part.label}>
            <Typography variant="overline" color="text.secondary" component="h2">
              {part.label}
            </Typography>
            <Box
              role="list"
              aria-label={`${part.label} slots`}
              sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}
            >
              {inPart.map(({ slot, index }) => (
                <SlotButton
                  key={slot.startsAt}
                  slot={slot}
                  selected={isSlotSelected(slots, index, selectedStart, hours)}
                  onSelect={onSelect}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: Slot;
  selected: boolean;
  onSelect: (startsAt: string) => void;
}) {
  const unavailable = slot.status !== 'available';
  return (
    <Button
      role="listitem"
      aria-pressed={selected}
      aria-label={`${slot.time} ${LABEL[slot.status]}`}
      disabled={unavailable}
      variant={selected ? 'contained' : 'outlined'}
      onClick={() => onSelect(slot.startsAt)}
      sx={(t) => ({
        flexDirection: 'column',
        py: 1.25,
        borderRadius: '10px',
        ...(!selected &&
          !unavailable && {
            bgcolor: alpha(t.palette.primary.main, 0.06),
            borderColor: alpha(t.palette.primary.main, 0.25),
            '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.12), borderColor: t.palette.primary.main },
          }),
        // Booked: grey and struck through, so it reads as "not for you", not as an error.
        '&.Mui-disabled':
          slot.status === 'taken'
            ? { bgcolor: t.palette.grey[100], borderColor: t.palette.grey[200], color: t.palette.text.disabled }
            : { borderStyle: 'dashed', color: t.palette.text.disabled },
      })}
    >
      <Box
        component="span"
        sx={{ fontWeight: 700, fontSize: 15, textDecoration: slot.status === 'taken' ? 'line-through' : 'none' }}
      >
        {slot.time}
      </Box>
      <Box component="span" sx={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
        {selected ? 'Selected' : LABEL[slot.status]}
      </Box>
    </Button>
  );
}
