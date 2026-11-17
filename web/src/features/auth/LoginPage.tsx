import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { type FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { errorMessage } from '../../api/errors';
import { AuthCard } from './AuthCard';
import { useLoginMutation } from './authApi';

export function LoginPage() {
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void login({ email, password }); // on success, authApi stores the session → redirect
  };

  return (
    <AuthCard
      title="Courtly"
      subtitle="Sign in to book a court."
      footer={
        <>
          <Typography variant="body2">
            No account?{' '}
            <Link component={RouterLink} to="/register">
              Create one
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Demo accounts are listed in the README.
          </Typography>
        </>
      }
    >
      <Stack component="form" spacing={2} onSubmit={submit}>
        {error && <Alert severity="error">{errorMessage(error)}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" size="large" disabled={isLoading}>
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </AuthCard>
  );
}
