/**
 * ArticleView — Public article detail page.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { publicApi, type Article } from '../../api/client';
import { CONFIG } from '../../config';

export default function ArticleView() {
  const { articleId } = useParams<{ articleId: string }>();

  // Use the trending/latest endpoints to find the article since we don't have a public single-article endpoint by ID
  // For now, we'll use the articles from the featured/latest data
  const { data: latestData } = useQuery({
    queryKey: ['public-latest'],
    queryFn: () => publicApi.latest(1),
  });

  const articles = latestData?.results ?? [];
  const article = articles.find((a: Article) => a.id === articleId);

  if (!article) {
    return (
      <div style={{
        maxWidth: 800,
        margin: '60px auto',
        padding: '0 24px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: '1.5rem',
          color: 'var(--color-text)',
          marginBottom: 12,
        }}>
          Article Loading...
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          If this persists, the article may not be available.
        </p>
        <Link to="/" style={{
          display: 'inline-block',
          marginTop: 20,
          padding: '10px 24px',
          borderRadius: CONFIG.radius.pill,
          background: CONFIG.colors.primary,
          color: '#fff',
          textDecoration: 'none',
          fontSize: '0.88rem',
          fontWeight: 600,
        }}>
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <article style={{
      maxWidth: 800,
      margin: '40px auto',
      padding: '0 24px',
    }}>
      {/* Category */}
      {article.category_name && (
        <Link
          to={`/category/${article.category_name.toLowerCase()}`}
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: CONFIG.colors.accent,
            textDecoration: 'none',
            marginBottom: 12,
            display: 'inline-block',
          }}
        >
          {article.category_name}
        </Link>
      )}

      {/* Headline */}
      <h1 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '2.2rem',
        fontWeight: 700,
        lineHeight: 1.2,
        color: 'var(--color-text)',
        marginBottom: 12,
      }}>
        {article.headline}
      </h1>

      {/* Subheadline */}
      {article.subheadline && (
        <p style={{
          fontSize: '1.1rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          marginBottom: 20,
        }}>
          {article.subheadline}
        </p>
      )}

      {/* Author + Date */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingBottom: 20,
        borderBottom: `1px solid var(--color-border)`,
        marginBottom: 24,
      }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${CONFIG.colors.primary}30, ${CONFIG.colors.accent}30)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-text)' }}>
            {article.author_name || article.byline}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
            {new Date(article.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Image */}
      {article.image && (
        <div style={{
          borderRadius: CONFIG.radius.lg,
          overflow: 'hidden',
          marginBottom: 24,
        }}>
          <img
            src={article.image}
            alt={article.headline}
            style={{ width: '100%', display: 'block' }}
          />
          {article.image_caption && (
            <p style={{
              fontSize: '0.78rem',
              color: 'var(--color-text-dim)',
              fontStyle: 'italic',
              padding: '8px 0',
            }}>
              {article.image_caption}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      <div
        style={{
          fontSize: '1.05rem',
          lineHeight: 1.8,
          color: 'var(--color-text)',
          fontFamily: CONFIG.typography.bodyFont,
        }}
        dangerouslySetInnerHTML={{
          __html: article.content_parsed || article.content_raw?.replace(/\n/g, '<br/>') || '',
        }}
      />

      {/* Edit remark */}
      {article.edit_remark && (
        <div style={{
          marginTop: 24,
          padding: '10px 16px',
          borderRadius: CONFIG.radius.md,
          background: 'rgba(212, 160, 23, 0.1)',
          border: `1px solid rgba(212, 160, 23, 0.2)`,
          fontSize: '0.82rem',
          color: CONFIG.colors.accent,
          fontStyle: 'italic',
        }}>
          {article.edit_remark}
        </div>
      )}
    </article>
  );
}
