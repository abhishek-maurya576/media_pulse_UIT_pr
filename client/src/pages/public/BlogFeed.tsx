/**
 * BlogFeed — Public blog post list.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { blogApi, type BlogPost } from '../../api/client';
import { CONFIG } from '../../config';

export default function BlogFeed() {
  const { data, isLoading } = useQuery({
    queryKey: ['public-blog'],
    queryFn: blogApi.publicList,
  });
  const posts = data?.results ?? [];

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
      <h1 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '2rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: 8,
      }}>
        Blog
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: '0.95rem' }}>
        Thoughts, insights, and stories from our journalists.
      </p>
      <div style={{ width: 60, height: 3, background: CONFIG.colors.accent, borderRadius: 2, marginBottom: 32 }} />

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 260, borderRadius: CONFIG.radius.lg, background: 'var(--color-bg-card)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', borderRadius: CONFIG.radius.lg, background: 'var(--color-bg-card)', border: `1px solid var(--color-border)` }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No blog posts yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {posts.map((post: BlogPost) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              style={{
                textDecoration: 'none',
                borderRadius: CONFIG.radius.lg,
                background: 'var(--color-bg-card)',
                border: `1px solid var(--color-border)`,
                overflow: 'hidden',
                transition: `all ${CONFIG.animation.normal}`,
                boxShadow: 'var(--shadow-card)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {post.cover_image && (
                <img src={post.cover_image} alt={post.title} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              )}
              <div style={{ padding: 20 }}>
                {/* Tags */}
                {post.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{
                        fontSize: '0.68rem',
                        padding: '2px 8px',
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
                <h3 style={{
                  fontFamily: CONFIG.typography.headlineFont,
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  marginBottom: 8,
                  lineHeight: 1.3,
                }}>
                  {post.title}
                </h3>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-muted)',
                  lineHeight: 1.5,
                  marginBottom: 12,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {post.excerpt}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                  <span>{post.author_name}</span>
                  <span>{post.views_count} views</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
