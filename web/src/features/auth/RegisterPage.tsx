import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useState } from 'react';
import { Navigate, Link as RouterLink } from 'react-router';
import { errorMessage } from '../../api/errors';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { useRegisterMutation } from './authApi';
import { signedIn } from './authSlice';

// Same limits as the API (bcrypt uses at most 72 bytes); the API checks again anyway.
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [register, { isLoading, error }] = useRegisterMutation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  if (user) return <Navigate to="/" replace />;

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD || password !== confirm) return;
    const result = await register({ name: name.trim(), email, password });
    if (result.data) {
      dispatch(signedIn({ token: result.data.accessToken, user: result.data.user }));
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Create an account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Sign up to book a court.
          </Typography>

          <Stack component="form" spacing={2} onSubmit={submit}>
            {error && <Alert severity="error">{errorMessage(error)}</Alert>}
            <TextField
              label="Name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              error={tooShort}
              helperText={`At least ${MIN_PASSWORD} characters`}
              slotProps={{ htmlInput: { maxLength: MAX_PASSWORD } }}
            />
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              error={mismatch}
              helperText={mismatch ? 'Passwords do not match' : ' '}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isLoading || password.length < MIN_PASSWORD || password !== confirm}
            >
              {isLoading ? 'Creating account…' : 'Create account'}
            </Button>
          </Stack>

          <Typography variant="body2" sx={{ mt: 3 }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
