import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import logoIcon from '../assets/logos/media_pulse_icon.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.user, res.token);
      toast.success(`Welcome back, ${res.user.first_name || res.user.username}!`);
      navigate(from, { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.non_field_errors?.[0] || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: 24,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--color-bg-card)',
          border: `1px solid var(--color-border)`,
          borderRadius: CONFIG.radius.xl,
          padding: 40,
          boxShadow: CONFIG.shadows.elevated,
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, textDecoration: 'none' }}>
          <img
            src={logoIcon}
            alt={CONFIG.app.name}
            style={{
              width: 44,
              height: 44,
              objectFit: 'contain',
            }}
          />
          <div>
            <div style={{
              fontFamily: CONFIG.typography.headlineFont,
              fontWeight: 700,
              fontSize: '1.2rem',
            }}>
              {CONFIG.app.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
              {CONFIG.app.tagline}
            </div>
          </div>
        </Link>

        <h2 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: '1.4rem',
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Sign In
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 28 }}>
          Enter your credentials to access the newsroom
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="input"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-dim)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <LogIn size={18} />}
            Sign In
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: 24,
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
        }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: CONFIG.colors.accent, fontWeight: 500 }}>
            Register
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
