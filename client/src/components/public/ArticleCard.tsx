/**
 * ArticleCard — Social-style news card for public feeds.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../../config';
import type { Article } from '../../api/client';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact' | 'hero';
}

export default function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const isHero = variant === 'hero';
  const isCompact = variant === 'compact';

  return (
    <Link
      to={`/article/${article.id}`}
      style={{
        textDecoration: 'none',
        display: 'block',
        borderRadius: CONFIG.radius.lg,
        background: 'var(--color-bg-card)',
        border: `1px solid var(--color-border)`,
        overflow: 'hidden',
        transition: `all ${CONFIG.animation.normal}`,
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
      }}
    >
      {/* Image */}
      {article.image && (
        <div style={{
          width: '100%',
          height: isHero ? 320 : isCompact ? 140 : 200,
          background: 'var(--color-bg-elevated)',
          overflow: 'hidden',
        }}>
          <img
            src={article.image}
            alt={article.headline}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: `transform ${CONFIG.animation.slow}`,
            }}
          />
        </div>
      )}

      <div style={{ padding: isCompact ? 14 : 20 }}>
        {/* Category badge */}
        {article.category_name && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: CONFIG.colors.accent,
            marginBottom: 8,
            display: 'inline-block',
          }}>
            {article.category_name}
          </span>
        )}

        {/* Headline */}
        <h3 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: isHero ? '1.5rem' : isCompact ? '0.95rem' : '1.15rem',
          fontWeight: 700,
          lineHeight: 1.3,
          color: 'var(--color-text)',
          marginBottom: isCompact ? 6 : 10,
          display: '-webkit-box',
          WebkitLineClamp: isCompact ? 2 : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {article.headline}
        </h3>

        {/* Subheadline */}
        {!isCompact && article.subheadline && (
          <p style={{
            fontSize: '0.88rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.5,
            marginBottom: 12,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {article.subheadline}
          </p>
        )}

        {/* Meta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--color-text-dim)',
        }}>
          <span>{article.author_name || article.byline}</span>
          <span>{new Date(article.created_at).toLocaleDateString()}</span>
        </div>

        {/* Edit remark */}
        {article.edit_remark && (
          <div style={{
            marginTop: 8,
            padding: '4px 8px',
            borderRadius: CONFIG.radius.sm,
            background: 'rgba(212, 160, 23, 0.1)',
            fontSize: '0.7rem',
            color: CONFIG.colors.accent,
            fontStyle: 'italic',
          }}>
            {article.edit_remark}
          </div>
        )}
      </div>
    </Link>
  );
}
