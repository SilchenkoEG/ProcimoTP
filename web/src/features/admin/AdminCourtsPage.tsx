import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { errorCode, errorDetails, errorMessage } from '../../api/errors';
import type { Court } from '../../api/types';
import { QueryState } from '../../components/QueryState';
import { formatPrice, SPORT_LABEL } from '../../lib/format';
import {
  type CourtInput,
  useCreateCourtMutation,
  useGetAdminCourtsQuery,
  useUpdateCourtMutation,
} from './adminApi';
import { CourtFormDialog } from './CourtFormDialog';

type Changes = Partial<CourtInput> & { isActive?: boolean };

/** A change the API refused with 409 because it would break upcoming bookings. */
interface PendingConfirmation {
  court: Court;
  changes: Changes;
  affectedBookings: number;
}

export function AdminCourtsPage() {
  const { data: courts, isLoading, error } = useGetAdminCourtsQuery();
  const [createCourt, creating] = useCreateCourtMutation();
  const [updateCourt, updating] = useUpdateCourtMutation();

  // `undefined` = form closed, `null` = creating, Court = editing
  const [formCourt, setFormCourt] = useState<Court | null | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  /**
   * Step 1 of the confirm flow: try the change as-is. If the API answers
   * 409 COURT_HAS_UPCOMING_BOOKINGS, ask the admin before cancelling anything.
   */
  const applyChange = async (
    court: Court,
    changes: Changes,
  ): Promise<{ status: 'done' | 'needs-confirmation' } | { status: 'error'; message: string }> => {
    const result = await updateCourt({ id: court.id, changes });
    if (!result.error) return { status: 'done' };
    if (errorCode(result.error) === 'COURT_HAS_UPCOMING_BOOKINGS') {
      const details = errorDetails<{ affectedBookings: number }>(result.error);
      setPending({ court, changes, affectedBookings: details?.affectedBookings ?? 0 });
      return { status: 'needs-confirmation' };
    }
    return { status: 'error', message: errorMessage(result.error) };
  };

  /** Step 2: the admin confirmed — apply the change and cancel those bookings (one transaction). */
  const confirmPending = async () => {
    if (!pending) return;
    const result = await updateCourt({
      id: pending.court.id,
      changes: pending.changes,
      cancelAffectedBookings: true,
    });
    setNotice(
      result.error
        ? { ok: false, text: errorMessage(result.error) }
        : {
            ok: true,
            text: `${pending.court.name} updated; ${pending.affectedBookings} booking(s) cancelled.`,
          },
    );
    setPending(null);
  };

  const submitForm = async (input: CourtInput) => {
    setFormError(null);
    if (formCourt) {
      const outcome = await applyChange(formCourt, input);
      if (outcome.status === 'error') setFormError(outcome.message);
      else {
        setFormCourt(undefined); // done, or the confirm dialog takes over
        if (outcome.status === 'done') setNotice({ ok: true, text: `${input.name} saved.` });
      }
    } else {
      const result = await createCourt(input);
      if (result.error) setFormError(errorMessage(result.error));
      else {
        setFormCourt(undefined);
        setNotice({ ok: true, text: `${input.name} created.` });
      }
    }
  };

  const toggleActive = async (court: Court) => {
    setNotice(null);
    const isActive = !court.isActive;
    const outcome = await applyChange(court, { isActive });
    if (outcome.status === 'error') setNotice({ ok: false, text: outcome.message });
    if (outcome.status === 'done') {
      setNotice({ ok: true, text: `${court.name} ${isActive ? 'activated' : 'deactivated'}.` });
    }
  };

  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Manage courts
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setFormError(null);
            setFormCourt(null);
          }}
        >
          New court
        </Button>
      </Stack>

      {notice && (
        <Alert severity={notice.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      <QueryState isLoading={isLoading} error={error}>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="Courts">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Sport</TableCell>
                <TableCell align="right">Price / h</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courts?.map((court) => (
                <TableRow key={court.id} sx={{ opacity: court.isActive ? 1 : 0.6 }}>
                  <TableCell>{court.name}</TableCell>
                  <TableCell>{SPORT_LABEL[court.sport]}</TableCell>
                  <TableCell align="right">{formatPrice(court.priceCents)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {court.opensAt}–{court.closesAt}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={court.isActive ? 'success' : 'default'}
                      label={court.isActive ? 'Active' : 'Inactive'}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Button
                      size="small"
                      onClick={() => {
                        setFormError(null);
                        setFormCourt(court);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color={court.isActive ? 'error' : 'primary'}
                      disabled={updating.isLoading}
                      onClick={() => toggleActive(court)}
                    >
                      {court.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </QueryState>

      {formCourt !== undefined && (
        <CourtFormDialog
          // Remount per court so the form starts from that court's values.
          key={formCourt?.id ?? 'new'}
          open
          court={formCourt}
          error={formError}
          saving={creating.isLoading || updating.isLoading}
          onClose={() => setFormCourt(undefined)}
          onSubmit={submitForm}
        />
      )}

      <Dialog open={pending !== null} onClose={() => setPending(null)}>
        <DialogTitle>
          {pending?.changes.isActive === false
            ? `Deactivate ${pending.court.name}?`
            : `Change ${pending?.court.name}?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pending?.court.name} has {pending?.affectedBookings} upcoming booking(s) that{' '}
            {pending?.changes.isActive === false
              ? 'would be on an inactive court'
              : 'fall outside the new opening hours'}
            . Applying this change will cancel them. Past bookings are kept.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Keep as is</Button>
          <Button color="error" variant="contained" onClick={confirmPending} disabled={updating.isLoading}>
            Apply and cancel bookings
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
