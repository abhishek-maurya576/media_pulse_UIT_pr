/**
 * PublicLayout — Wrapper for public-facing pages.
 * Contains PublicNavbar + Footer with Outlet for page content.
 * Fetches user profile if a token exists in localStorage.
 */

import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/client';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';

export default function PublicLayout() {
  const { user, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    const token = localStorage.getItem('mp_token');
    if (token && !user) {
      authApi.profile()
        .then((userData) => setAuth(userData, token))
        .catch(() => clearAuth());
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <PublicNavbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
