/**
 * PublicNavbar — Sticky navbar with categories, search, login, theme toggle.
 * Shrinks on scroll for modern feel.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../ThemeToggle';
import { CONFIG } from '../../config';
import logoIcon from '../../assets/logos/media_pulse_icon.png';

export default function PublicNavbar() {
  const { isAuthenticated, user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    clearAuth();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'var(--color-bg-card)',
        borderBottom: `1px solid var(--color-border)`,
        transition: `all ${CONFIG.animation.normal}`,
        padding: scrolled ? '8px 0' : '14px 0',
      }}
    >
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        {/* Logo */}
        <Link to="/" style={{
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <img
            src={logoIcon}
            alt={CONFIG.app.name}
            style={{
              width: scrolled ? 32 : 36,
              height: scrolled ? 32 : 36,
              objectFit: 'contain',
              transition: `all ${CONFIG.animation.normal}`,
            }}
          />
          <span style={{
            fontFamily: CONFIG.typography.headlineFont,
            fontWeight: 700,
            fontSize: scrolled ? '1rem' : '1.15rem',
            color: 'var(--color-text)',
            transition: `font-size ${CONFIG.animation.normal}`,
          }}>
            {CONFIG.app.name}
          </span>
        </Link>

        {/* Category Nav — hidden on mobile */}
        <nav style={{
          display: 'flex',
          gap: 4,
          overflow: 'hidden',
          flex: 1,
          justifyContent: 'center',
        }}>
          {CONFIG.navCategories.slice(0, 6).map(cat => (
            <Link
              key={cat}
              to={`/category/${cat.toLowerCase()}`}
              style={{
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: CONFIG.radius.pill,
                fontSize: '0.82rem',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                transition: `all ${CONFIG.animation.fast}`,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-bg-hover)';
                e.currentTarget.style.color = 'var(--color-text)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              {cat}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Search */}
          {searchOpen ? (
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 4 }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search articles..."
                style={{
                  padding: '6px 12px',
                  borderRadius: CONFIG.radius.pill,
                  border: `1px solid var(--color-border)`,
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: 180,
                }}
                onBlur={() => !searchQuery && setSearchOpen(false)}
              />
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              style={{
                background: 'none',
                border: `1px solid var(--color-border)`,
                borderRadius: CONFIG.radius.sm,
                padding: 6,
                cursor: 'pointer',
                color: 'var(--color-text-muted)',
                display: 'flex',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          )}

          <ThemeToggle size={18} />

          {isAuthenticated && user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  padding: '6px 16px',
                  borderRadius: CONFIG.radius.pill,
                  background: `linear-gradient(135deg, ${CONFIG.colors.primary}, ${CONFIG.colors.primaryHover})`,
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  transition: `all ${CONFIG.animation.fast}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {user.username}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'var(--color-bg-card)',
                  border: `1px solid var(--color-border)`,
                  borderRadius: CONFIG.radius.md,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  minWidth: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  zIndex: 200,
                }}>
                  <Link
                    to={user.is_journalist ? '/dashboard' : `/profile/${user.username}`}
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      padding: '10px 16px',
                      textDecoration: 'none',
                      color: 'var(--color-text)',
                      fontSize: '0.85rem',
                      borderBottom: `1px dashed var(--color-border)`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {user.is_journalist ? 'Dashboard' : 'Profile'}
                  </Link>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: '10px 16px',
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 500,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <Link
                to="/login"
                style={{
                  padding: '6px 16px',
                  borderRadius: CONFIG.radius.pill,
                  border: `1px solid var(--color-border)`,
                  color: 'var(--color-text)',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '6px 16px',
                  borderRadius: CONFIG.radius.pill,
                  background: CONFIG.colors.primary,
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
