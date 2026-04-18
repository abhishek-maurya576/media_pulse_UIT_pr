import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';

interface ProtectedRouteProps {
  requiredRole?: string;
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, setAuth, clearAuth, setLoading, hasPermission } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('mp_token');
    if (token && !user) {
      authApi.profile()
        .then((userData) => {
          setAuth(userData, token);
        })
        .catch(() => {
          clearAuth();
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
