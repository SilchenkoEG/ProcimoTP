import { Box, Card, CardContent, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAppSelector } from '../../app/store';

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
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            {title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
          {children}
          <Box sx={{ mt: 3 }}>{footer}</Box>
        </CardContent>
      </Card>
    </Box>
  );
}
