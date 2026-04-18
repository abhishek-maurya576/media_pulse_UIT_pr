import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import logoIcon from '../assets/logos/media_pulse_icon.png';
import logoText from '../assets/logos/media_pulse_text.png';
import {
  LayoutDashboard,
  Newspaper,
  FileText,
  FolderOpen,
  LayoutTemplate,
  Image,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, minRole: 'JOURNALIST' },
  { path: '/dashboard/articles', label: 'Articles', icon: FileText, minRole: 'JOURNALIST' },
  { path: '/dashboard/blog', label: 'Blog Posts', icon: Newspaper, minRole: 'JOURNALIST' },
  { path: '/dashboard/categories', label: 'Categories', icon: FolderOpen, minRole: 'EDITOR' },
  { path: '/dashboard/templates', label: 'Templates', icon: LayoutTemplate, minRole: 'EDITOR' },
  { path: '/dashboard/media', label: 'Media Library', icon: Image, minRole: 'JOURNALIST' },
  { path: '/dashboard/settings', label: 'Settings', icon: Settings, minRole: 'ADMIN' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user, clearAuth, hasPermission } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuth();
    toast.success('Logged out');
    navigate('/login');
  };

  const visibleItems = navItems.filter(item => hasPermission(item.minRole));

  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: sidebarOpen ? 260 : 68,
        background: 'var(--color-bg-card)',
        borderRight: `1px solid var(--color-border)`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Brand Logo — click goes to landing page */}
      <Link
        to="/"
        style={{
          padding: sidebarOpen ? '20px 20px 16px' : '20px 12px 16px',
          borderBottom: `1px solid var(--color-border)`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minHeight: 64,
          textDecoration: 'none',
        }}
      >
        <img
          src={logoIcon}
          alt={CONFIG.app.name}
          style={{
            width: 36,
            height: 36,
            objectFit: 'contain',
            flexShrink: 0,
          }}
        />
        {sidebarOpen && (
          <img
            src={logoText}
            alt={CONFIG.app.name}
            style={{
              height: 28,
              objectFit: 'contain',
              overflow: 'hidden',
            }}
          />
        )}
      </Link>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px 8px', overflow: 'hidden' }}>
        {visibleItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: sidebarOpen ? '10px 12px' : '10px',
              borderRadius: CONFIG.radius.md,
              color: isActive ? CONFIG.colors.accent : 'var(--color-text-muted)',
              background: isActive ? CONFIG.colors.accentGlow : 'transparent',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 400,
              transition: `all ${CONFIG.animation.fast}`,
              marginBottom: 4,
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              borderLeft: isActive ? `3px solid ${CONFIG.colors.accent}` : '3px solid transparent',
            })}
          >
            <Icon size={20} style={{ flexShrink: 0 }} />
            {sidebarOpen && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Info + Logout */}
      <div style={{
        borderTop: `1px solid var(--color-border)`,
        padding: sidebarOpen ? '12px 16px' : '12px 8px',
      }}>
        {user && sidebarOpen && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--color-bg-elevated)',
              border: `1px solid var(--color-border)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={16} color="var(--color-text-muted)" />
            </div>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {user.first_name || user.username}
              </div>
              <div style={{
                fontSize: '0.68rem',
                color: 'var(--color-text-dim)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {user.role}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleLogout}
            style={{
              flex: 1,
              padding: sidebarOpen ? '8px 12px' : '8px',
              background: 'none',
              border: `1px solid var(--color-border)`,
              borderRadius: CONFIG.radius.sm,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.78rem',
              transition: `all ${CONFIG.animation.fast}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = CONFIG.colors.danger;
              e.currentTarget.style.color = CONFIG.colors.danger;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.color = 'var(--color-text-muted)';
            }}
          >
            <LogOut size={14} />
            {sidebarOpen && 'Logout'}
          </button>

          <button
            onClick={toggleSidebar}
            style={{
              padding: 8,
              background: 'none',
              border: `1px solid var(--color-border)`,
              borderRadius: CONFIG.radius.sm,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `color ${CONFIG.animation.fast}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
