import LogoutIcon from '@mui/icons-material/Logout';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Container,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Logo } from '../components/Logo';
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

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export function AppLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  if (!user) return null;

  return (
    <>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ gap: { xs: 1, sm: 3 }, minHeight: { xs: 64 } }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Logo size={30} />
            </Box>
            <Stack direction="row" spacing={0.5} component="nav" sx={{ alignSelf: 'stretch' }}>
              {NAV[user.role].map((item) => (
                <Button
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  sx={{
                    px: 1.5,
                    borderRadius: 0,
                    color: 'text.secondary',
                    '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
                    // The current page gets a green underline.
                    '&.active': {
                      color: 'primary.main',
                      boxShadow: (t) => `inset 0 -2px 0 ${t.palette.primary.main}`,
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <ButtonBase
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label="Account menu"
              sx={{
                borderRadius: '999px',
                p: 0.5,
                pr: { xs: 0.5, sm: 1.5 },
                gap: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Avatar sx={{ width: 32, height: 32, fontSize: 14, fontWeight: 600, bgcolor: 'primary.main' }}>
                {initials(user.name)}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                  {user.role === 'admin' ? 'Administrator' : 'Player'}
                </Typography>
              </Box>
            </ButtonBase>
            <Menu
              anchorEl={menuAnchor}
              open={menuAnchor !== null}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => dispatch(signedOut())}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Sign out
              </MenuItem>
            </Menu>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
        <Outlet />
      </Container>
    </>
  );
}
