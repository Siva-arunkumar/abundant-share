import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowDevOverride?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
  , allowDevOverride = false
}) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    // Redirect non-admins away from admin routes
    // allow dev override on localhost when explicitly requested
    if (requiredRole === 'admin' && allowDevOverride && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      const params = new URLSearchParams(window.location.search || '');
      if (params.get('dev_admin') === '1') {
        return <>{children}</>;
      }
    }
    if (requiredRole === 'admin' && profile?.role !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;