import { Navigate, Outlet } from 'react-router';
import type { Role } from '../api/types';
import { useAppSelector } from './store';

/**
 * Route guard. This only shapes the UI — the API enforces roles on every request,
 * so a user editing the URL still gets 403 from the server.
 */
export function RequireAuth({ role }: { role?: Role }) {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** "/" sends each role to its main screen. */
export function HomeRedirect() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin/bookings' : '/courts'} replace />;
}
