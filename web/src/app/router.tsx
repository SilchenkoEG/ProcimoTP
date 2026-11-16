import { createBrowserRouter } from 'react-router';
import { AdminCourtsPage } from '../features/admin/AdminCourtsPage';
import { AdminDayPage } from '../features/admin/AdminDayPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { CourtAvailabilityPage } from '../features/bookings/CourtAvailabilityPage';
import { MyBookingsPage } from '../features/bookings/MyBookingsPage';
import { CourtsPage } from '../features/courts/CourtsPage';
import { AppLayout } from './AppLayout';
import { HomeRedirect, RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
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
              { path: '/courts', element: <CourtsPage /> },
              { path: '/courts/:courtId', element: <CourtAvailabilityPage /> },
              { path: '/bookings', element: <MyBookingsPage /> },
            ],
          },
          {
            element: <RequireAuth role="admin" />,
            children: [
              { path: '/admin/bookings', element: <AdminDayPage /> },
              { path: '/admin/courts', element: <AdminCourtsPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <HomeRedirect /> },
]);
