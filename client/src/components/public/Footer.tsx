/**
 * Footer — Standard footer with links and branding.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../../config';
import logoFull from '../../assets/logos/media_pulse_full.png';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--color-bg-card)',
      borderTop: `1px solid var(--color-border)`,
      padding: '48px 24px 24px',
      marginTop: 48,
    }}>
      <div style={{
        maxWidth: 1280,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 32,
        marginBottom: 32,
      }}>
        {/* Brand */}
        <div>
          <img
            src={logoFull}
            alt={CONFIG.app.name}
            style={{
              height: 48,
              objectFit: 'contain',
              marginBottom: 12,
            }}
          />
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
          }}>
            Your trusted source for news, insights, and community-driven journalism.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-dim)',
            marginBottom: 12,
          }}>
            Quick Links
          </h4>
          {['/', '/blog', '/search'].map((path, i) => (
            <Link
              key={path}
              to={path}
              style={{
                display: 'block',
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                marginBottom: 8,
                transition: `color ${CONFIG.animation.fast}`,
              }}
              onMouseEnter={e => e.currentTarget.style.color = CONFIG.colors.accent}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              {['Home', 'Blog', 'Search'][i]}
            </Link>
          ))}
        </div>

        {/* Categories */}
        <div>
          <h4 style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-dim)',
            marginBottom: 12,
          }}>
            Categories
          </h4>
          {CONFIG.navCategories.slice(0, 5).map(cat => (
            <Link
              key={cat}
              to={`/category/${cat.toLowerCase()}`}
              style={{
                display: 'block',
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                marginBottom: 8,
                transition: `color ${CONFIG.animation.fast}`,
              }}
              onMouseEnter={e => e.currentTarget.style.color = CONFIG.colors.accent}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
            >
              {cat}
            </Link>
          ))}
        </div>

        {/* Legal */}
        <div>
          <h4 style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-text-dim)',
            marginBottom: 12,
          }}>
            Legal
          </h4>
          {['About', 'Contact', 'Privacy Policy', 'Terms of Service'].map(item => (
            <span
              key={item}
              style={{
                display: 'block',
                fontSize: '0.88rem',
                color: 'var(--color-text-muted)',
                marginBottom: 8,
                cursor: 'default',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        borderTop: `1px solid var(--color-border)`,
        paddingTop: 20,
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--color-text-dim)',
      }}>
        &copy; {new Date().getFullYear()} {CONFIG.app.name}. All rights reserved.
      </div>
    </footer>
  );
}
