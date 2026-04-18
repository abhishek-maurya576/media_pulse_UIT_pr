/**
 * JournalistHighlights — Top journalist cards with follow button.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../../config';
import type { Journalist } from '../../api/client';

interface JournalistHighlightsProps {
  journalists: Journalist[];
}

export default function JournalistHighlights({ journalists }: JournalistHighlightsProps) {
  if (!journalists.length) return null;

  return (
    <section style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '32px 24px',
    }}>
      <h2 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{
          width: 4,
          height: 24,
          borderRadius: 2,
          background: CONFIG.colors.accent,
          display: 'inline-block',
        }} />
        Top Journalists
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 16,
      }}>
        {journalists.map(j => (
          <Link
            key={j.id}
            to={`/profile/${j.username}`}
            style={{
              textDecoration: 'none',
              padding: 20,
              borderRadius: CONFIG.radius.lg,
              background: 'var(--color-bg-card)',
              border: `1px solid var(--color-border)`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transition: `all ${CONFIG.animation.normal}`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = CONFIG.colors.accent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--color-border)';
            }}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${CONFIG.colors.primary}30, ${CONFIG.colors.accent}30)`,
              border: `2px solid ${CONFIG.colors.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
              overflow: 'hidden',
            }}>
              {j.avatar ? (
                <img src={j.avatar} alt={j.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
            <h3 style={{
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              marginBottom: 4,
            }}>
              {j.full_name}
            </h3>
            <span style={{
              fontSize: '0.72rem',
              color: CONFIG.colors.accent,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 8,
            }}>
              {j.role}
            </span>
            {j.bio && (
              <p style={{
                fontSize: '0.78rem',
                color: 'var(--color-text-dim)',
                lineHeight: 1.4,
                marginBottom: 10,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {j.bio}
              </p>
            )}
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}>
              {j.article_count} articles
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
