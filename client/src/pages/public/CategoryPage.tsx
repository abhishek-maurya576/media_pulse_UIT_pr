/**
 * CategoryPage — Articles filtered by category.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { publicApi, type Article } from '../../api/client';
import ArticleCard from '../../components/public/ArticleCard';
import { CONFIG } from '../../config';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['public-category', slug],
    queryFn: () => publicApi.categoryArticles(slug || '', 1),
    enabled: !!slug,
  });

  const articles = data?.results ?? [];
  const displayName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '';

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: 8,
      }}>
        {displayName}
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
        Latest articles in {displayName}
      </p>
      <div style={{ width: 60, height: 3, background: CONFIG.colors.primary, borderRadius: 2, marginBottom: 32 }} />

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 280, borderRadius: CONFIG.radius.lg, background: 'var(--color-bg-card)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', borderRadius: CONFIG.radius.lg, background: 'var(--color-bg-card)', border: `1px solid var(--color-border)` }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No articles found in {displayName}.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {articles.map((article: Article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
