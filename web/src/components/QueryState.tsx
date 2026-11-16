import { Alert, Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import { errorMessage } from '../api/errors';

/** Loading spinner / error message / content — the same three states on every screen. */
export function QueryState({
  isLoading,
  error,
  children,
}: {
  isLoading: boolean;
  error: Parameters<typeof errorMessage>[0];
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label="Loading" />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{errorMessage(error)}</Alert>;
  return <>{children}</>;
}
