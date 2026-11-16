import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router';
import { errorMessage } from '../../api/errors';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { useLoginMutation } from './authApi';
import { signedIn } from './authSlice';

const DEMO_ACCOUNTS = [
  { label: 'Alice (user)', email: 'alice@courtly.test', password: 'user123' },
  { label: 'Bob (user)', email: 'bob@courtly.test', password: 'user123' },
  { label: 'Admin', email: 'admin@courtly.test', password: 'admin123' },
];

export function LoginPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await login({ email, password });
    if (result.data) {
      dispatch(signedIn({ token: result.data.accessToken, user: result.data.user }));
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Courtly
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Sign in to book a court.
          </Typography>

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

          {/* Demo convenience: seeded accounts, so reviewers don't need to read the README. */}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
            Demo accounts:
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                size="small"
                variant="outlined"
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.password);
                }}
              >
                {a.label}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
