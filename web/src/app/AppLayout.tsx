import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet } from 'react-router';
import { signedOut } from '../features/auth/authSlice';
import { useAppDispatch, useAppSelector } from './store';

const NAV = {
  user: [
    { to: '/courts', label: 'Courts' },
    { to: '/bookings', label: 'My bookings' },
  ],
  admin: [
    { to: '/admin/bookings', label: 'Day view' },
    { to: '/admin/courts', label: 'Courts' },
  ],
} as const;

export function AppLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;

  return (
    <>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" component="span" sx={{ mr: 2 }}>
            Courtly
          </Typography>
          {NAV[user.role].map((item) => (
            <Button
              key={item.to}
              component={NavLink}
              to={item.to}
              color="inherit"
              sx={{ '&.active': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              {item.label}
            </Button>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mr: 1 }}>
            {user.name}
            {user.role === 'admin' ? ' (admin)' : ''}
          </Typography>
          <Button color="inherit" onClick={() => dispatch(signedOut())}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </>
  );
}
