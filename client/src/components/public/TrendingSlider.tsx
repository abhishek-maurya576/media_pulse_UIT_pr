/**
 * TrendingSlider — Horizontal card carousel for trending articles.
 */

import React from 'react';
import ArticleCard from './ArticleCard';
import { CONFIG } from '../../config';
import type { Article } from '../../api/client';

interface TrendingSliderProps {
  articles: Article[];
  title?: string;
}

export default function TrendingSlider({ articles, title = 'Trending Now' }: TrendingSliderProps) {
  if (!articles.length) return null;

  return (
    <section style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '8px 24px 24px',
    }}>
      <h2 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{
          width: 4,
          height: 24,
          borderRadius: 2,
          background: CONFIG.colors.primary,
          display: 'inline-block',
        }} />
        {title}
      </h2>
      <div style={{
        display: 'flex',
        gap: 16,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 8,
      }}>
        {articles.map(article => (
          <div key={article.id} style={{ minWidth: 280, maxWidth: 320, flexShrink: 0 }}>
            <ArticleCard article={article} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
