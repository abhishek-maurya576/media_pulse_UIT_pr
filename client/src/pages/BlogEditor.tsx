/**
 * BlogEditor — Create/edit blog posts (Journalist+).
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { blogApi } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';

export default function BlogEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [tags, setTags] = useState('');

  const { data: existingPost } = useQuery({
    queryKey: ['blog-manage', id],
    queryFn: () => blogApi.get(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingPost) {
      setTitle(existingPost.title);
      setContent(existingPost.content);
      setExcerpt(existingPost.excerpt || '');
      setStatus(existingPost.status);
      setTags(existingPost.tags?.join(', ') || '');
    }
  }, [existingPost]);

  const createMutation = useMutation({
    mutationFn: () => {
      const data = {
        title,
        content,
        excerpt,
        status,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      return isEditMode ? blogApi.update(id!, data) : blogApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-blog-posts'] });
      toast.success(isEditMode ? 'Post updated' : 'Post created');
      navigate('/dashboard/blog');
    },
    onError: () => toast.error('Failed to save'),
  });

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{
        fontFamily: CONFIG.typography.headlineFont,
        fontSize: '1.6rem',
        fontWeight: 700,
        color: 'var(--color-text)',
        marginBottom: 24,
      }}>
        {isEditMode ? 'Edit Post' : 'New Blog Post'}
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Write a compelling title..."
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: CONFIG.radius.md,
              border: `1px solid var(--color-border)`,
              background: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              fontSize: '1.1rem',
              fontFamily: CONFIG.typography.headlineFont,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Excerpt */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Excerpt (optional)
          </label>
          <input
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Short preview text..."
            style={{
              width: '100%',
              padding: '10px 16px',
              borderRadius: CONFIG.radius.md,
              border: `1px solid var(--color-border)`,
              background: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              fontSize: '0.92rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Content */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Content
          </label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your post content..."
            rows={16}
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: CONFIG.radius.md,
              border: `1px solid var(--color-border)`,
              background: 'var(--color-bg-card)',
              color: 'var(--color-text)',
              fontSize: '0.95rem',
              lineHeight: 1.7,
              outline: 'none',
              resize: 'vertical',
              fontFamily: CONFIG.typography.bodyFont,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tags + Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Tags (comma separated)
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tech, news, opinion..."
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: CONFIG.radius.md,
                border: `1px solid var(--color-border)`,
                background: 'var(--color-bg-card)',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: CONFIG.radius.md,
                border: `1px solid var(--color-border)`,
                background: 'var(--color-bg-card)',
                color: 'var(--color-text)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }}>
          <button
            onClick={() => navigate('/dashboard/blog')}
            style={{
              padding: '10px 24px',
              borderRadius: CONFIG.radius.pill,
              background: 'var(--color-bg-hover)',
              border: `1px solid var(--color-border)`,
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '0.88rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
            style={{
              padding: '10px 28px',
              borderRadius: CONFIG.radius.pill,
              background: CONFIG.colors.primary,
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              opacity: (!title.trim() || !content.trim()) ? 0.5 : 1,
            }}
          >
            {createMutation.isPending ? 'Saving...' : isEditMode ? 'Update Post' : 'Create Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
