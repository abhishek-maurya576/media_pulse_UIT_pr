/**
 * BlogPostView — Single blog post reading page.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { blogApi } from '../../api/client';
import { CONFIG } from '../../config';

export default function BlogPostView() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: () => blogApi.publicDetail(slug || ''),
    enabled: !!slug,
  });

  if (isLoading) {
    return <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center' }}><div className="spinner" /></div>;
  }

  if (!post) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: CONFIG.typography.headlineFont, color: 'var(--color-text)' }}>Post not found</h1>
        <Link to="/blog" style={{ color: CONFIG.colors.accent }}>Back to blog</Link>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
      {/* Tags */}
      {post.tags?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {post.tags.map(tag => (
            <span key={tag} style={{
              fontSize: '0.72rem',
              padding: '3px 10px',
              borderRadius: CONFIG.radius.pill,
              background: CONFIG.colors.accentGlow,
              color: CONFIG.colors.accent,
              fontWeight: 600,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <h1 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '2.2rem',
        fontWeight: 700,
        lineHeight: 1.2,
        color: 'var(--color-text)',
        marginBottom: 16,
      }}>
        {post.title}
      </h1>

      {/* Author */}
      <Link
        to={`/profile/${post.author_username}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          textDecoration: 'none',
          paddingBottom: 20,
          borderBottom: `1px solid var(--color-border)`,
          marginBottom: 24,
        }}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${CONFIG.colors.primary}30, ${CONFIG.colors.accent}30)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {post.author_avatar ? (
            <img src={post.author_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--color-text)' }}>{post.author_name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
            {post.published_at ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''} &middot; {post.views_count} views
          </div>
        </div>
      </Link>

      {/* Cover Image */}
      {post.cover_image && (
        <div style={{ borderRadius: CONFIG.radius.lg, overflow: 'hidden', marginBottom: 24 }}>
          <img src={post.cover_image} alt={post.title} style={{ width: '100%', display: 'block' }} />
        </div>
      )}

      {/* Content */}
      <div style={{
        fontSize: '1.05rem',
        lineHeight: 1.8,
        color: 'var(--color-text)',
        whiteSpace: 'pre-wrap',
      }}>
        {post.content}
      </div>

      {/* Edit remark */}
      {post.edit_remark && (
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
          {post.edit_remark}
        </div>
      )}
    </article>
  );
}
