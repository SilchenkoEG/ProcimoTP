import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAppSelector } from '../../app/store';
import { Logo } from '../../components/Logo';

/** The centred card shared by the sign-in and sign-up pages. Signed-in users go home. */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const user = useAppSelector((s) => s.auth.user);
  if (user) return <Navigate to="/" replace />;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background: 'radial-gradient(ellipse at top, #dcefe5 0%, #f4f7f5 60%)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Logo size={40} />
        </Box>
        <Card sx={{ boxShadow: '0 12px 32px rgba(20, 33, 27, 0.08)' }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Typography variant="h5" component="h1">
              {title}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
              {subtitle}
            </Typography>
            {children}
          </CardContent>
        </Card>
        <Box sx={{ mt: 3, textAlign: 'center' }}>{footer}</Box>
      </Box>
    </Box>
  );
}
