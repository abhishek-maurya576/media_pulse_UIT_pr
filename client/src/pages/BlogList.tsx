/**
 * BlogList — Dashboard blog management page for Journalist+.
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { blogApi, type BlogPost } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';

export default function BlogList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-blog-posts'],
    queryFn: blogApi.myPosts,
  });

  const deleteMutation = useMutation({
    mutationFn: blogApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-blog-posts'] });
      toast.success('Post deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const posts = data?.results ?? [];

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      }}>
        <div>
          <h1 style={{
            fontFamily: CONFIG.typography.headlineFont,
            fontSize: '1.6rem',
            fontWeight: 700,
            color: 'var(--color-text)',
          }}>
            My Blog Posts
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            Create and manage your blog posts.
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard/blog/new')}
          style={{
            padding: '10px 24px',
            borderRadius: CONFIG.radius.pill,
            background: CONFIG.colors.primary,
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Post
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 80, borderRadius: CONFIG.radius.md, background: 'var(--color-bg-elevated)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{
          padding: 48,
          textAlign: 'center',
          borderRadius: CONFIG.radius.lg,
          background: 'var(--color-bg-card)',
          border: `1px solid var(--color-border)`,
        }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No blog posts yet. Create your first one!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post: BlogPost) => (
            <div
              key={post.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderRadius: CONFIG.radius.md,
                background: 'var(--color-bg-card)',
                border: `1px solid var(--color-border)`,
                transition: `all ${CONFIG.animation.fast}`,
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  marginBottom: 4,
                }}>
                  {post.title}
                </h3>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: CONFIG.radius.pill,
                    background: post.status === 'PUBLISHED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(154, 149, 137, 0.15)',
                    color: post.status === 'PUBLISHED' ? CONFIG.colors.success : 'var(--color-text-muted)',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }}>
                    {post.status}
                  </span>
                  <span>{post.views_count} views</span>
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => navigate(`/dashboard/blog/${post.id}/edit`)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: CONFIG.radius.sm,
                    background: 'var(--color-bg-hover)',
                    border: `1px solid var(--color-border)`,
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this post?')) deleteMutation.mutate(post.id);
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: CONFIG.radius.sm,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid rgba(239, 68, 68, 0.2)`,
                    color: CONFIG.colors.danger,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
