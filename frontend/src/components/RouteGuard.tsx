import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type GuardProps = {
  requireAuth?: boolean;
  requireOnboardingComplete?: boolean;
  children: React.ReactNode;
};

export function RouteGuard({ requireAuth = false, requireOnboardingComplete = false, children }: GuardProps) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <div className="page"><p>Loading...</p></div>;
  }

  if (requireAuth && !session?.access_token) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboardingComplete && session?.access_token && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!requireOnboardingComplete && session?.access_token && profile && profile.onboarding_completed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
