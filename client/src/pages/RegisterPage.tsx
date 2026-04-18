import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import logoIcon from '../assets/logos/media_pulse_icon.png';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password !== form.password_confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register(form);
      setAuth(res.user, res.token);
      toast.success('Account created! Welcome to Media Puls.');
      navigate('/', { replace: true });
    } catch (err: any) {
      const errors = err?.response?.data;
      if (errors) {
        const firstError = Object.values(errors).flat()[0] as string;
        toast.error(firstError || 'Registration failed');
      } else {
        toast.error('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

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
          maxWidth: 460,
          background: 'var(--color-bg-card)',
          border: `1px solid var(--color-border)`,
          borderRadius: CONFIG.radius.xl,
          padding: 40,
          boxShadow: CONFIG.shadows.elevated,
        }}
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, textDecoration: 'none' }}>
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
              Create your newsroom account
            </div>
          </div>
        </Link>

        <h2 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: '1.3rem',
          fontWeight: 700,
          marginBottom: 24,
        }}>
          Register
        </h2>

        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input className="input" placeholder="First name" value={form.first_name} onChange={e => update('first_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input className="input" placeholder="Last name" value={form.last_name} onChange={e => update('last_name', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Username *</label>
            <input className="input" placeholder="Choose a username" value={form.username} onChange={e => update('username', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="input" type="email" placeholder="your@email.com" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', padding: 4,
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="input" type="password" placeholder="Repeat password" value={form.password_confirm} onChange={e => update('password_confirm', e.target.value)} />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <UserPlus size={18} />}
            Create Account
          </button>
        </form>

        <div style={{
          textAlign: 'center',
          marginTop: 20,
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: CONFIG.colors.accent, fontWeight: 500 }}>
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
