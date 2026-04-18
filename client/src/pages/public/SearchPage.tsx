/**
 * SearchPage — Search articles by headline/content.
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { publicApi, type Article } from '../../api/client';
import ArticleCard from '../../components/public/ArticleCard';
import { CONFIG } from '../../config';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [input, setInput] = useState(q);

  const { data, isLoading } = useQuery({
    queryKey: ['public-search', q],
    queryFn: () => publicApi.search(q, 1),
    enabled: !!q,
  });

  const articles = data?.results ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setSearchParams({ q: input.trim() });
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: 20,
      }}>
        Search
      </h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Search articles, news, stories..."
          style={{
            flex: 1,
            padding: '12px 20px',
            borderRadius: CONFIG.radius.pill,
            border: `1px solid var(--color-border)`,
            background: 'var(--color-bg-card)',
            color: 'var(--color-text)',
            fontSize: '0.95rem',
            outline: 'none',
            transition: `border-color ${CONFIG.animation.fast}`,
          }}
          onFocus={e => e.currentTarget.style.borderColor = CONFIG.colors.primary}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--color-border)'}
        />
        <button
          type="submit"
          style={{
            padding: '12px 28px',
            borderRadius: CONFIG.radius.pill,
            background: CONFIG.colors.primary,
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Search
        </button>
      </form>

      {q && (
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 20, fontSize: '0.92rem' }}>
          {isLoading ? 'Searching...' : `${articles.length} result${articles.length !== 1 ? 's' : ''} for "${q}"`}
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {articles.map((article: Article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
