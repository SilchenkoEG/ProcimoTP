import { Typography } from '@mui/material';
import { createBrowserRouter } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage';
import { AppLayout } from './AppLayout';
import { HomeRedirect, RequireAuth } from './RequireAuth';

// Placeholder until the feature screens land (next steps).
const Soon = ({ title }: { title: string }) => <Typography variant="h5">{title}</Typography>;

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <HomeRedirect /> },
          {
            element: <RequireAuth role="user" />,
            children: [
              { path: '/courts', element: <Soon title="Courts" /> },
              { path: '/bookings', element: <Soon title="My bookings" /> },
            ],
          },
          {
            element: <RequireAuth role="admin" />,
            children: [
              { path: '/admin/bookings', element: <Soon title="Day view" /> },
              { path: '/admin/courts', element: <Soon title="Manage courts" /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <HomeRedirect /> },
]);
