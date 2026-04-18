/**
 * CategoryChips — Horizontal pill chips for quick category navigation.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../../config';
import type { PublicCategory } from '../../api/client';

interface CategoryChipsProps {
  categories: PublicCategory[];
}

export default function CategoryChips({ categories }: CategoryChipsProps) {
  if (!categories.length) return null;

  return (
    <section style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '20px 24px',
      display: 'flex',
      gap: 8,
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      <Link
        to="/"
        style={{
          textDecoration: 'none',
          padding: '8px 20px',
          borderRadius: CONFIG.radius.pill,
          background: CONFIG.colors.primary,
          color: '#fff',
          fontSize: '0.82rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          transition: `all ${CONFIG.animation.fast}`,
          flexShrink: 0,
        }}
      >
        All
      </Link>
      {categories.map(cat => (
        <Link
          key={cat.id}
          to={`/category/${cat.name.toLowerCase()}`}
          style={{
            textDecoration: 'none',
            padding: '8px 20px',
            borderRadius: CONFIG.radius.pill,
            background: 'var(--color-bg-card)',
            border: `1px solid var(--color-border)`,
            color: 'var(--color-text-muted)',
            fontSize: '0.82rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            transition: `all ${CONFIG.animation.fast}`,
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = CONFIG.colors.primaryGlow;
            e.currentTarget.style.borderColor = CONFIG.colors.primary;
            e.currentTarget.style.color = 'var(--color-text)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--color-bg-card)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          {cat.name}
          {cat.article_count > 0 && (
            <span style={{ marginLeft: 6, opacity: 0.5, fontSize: '0.72rem' }}>{cat.article_count}</span>
          )}
        </Link>
      ))}
    </section>
  );
}
