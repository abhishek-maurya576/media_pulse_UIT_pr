import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { articleApi, type Article } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  Trash2,
  Edit3,
  Search,
  Filter,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ArticlesList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: articleApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: articleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Article deleted');
    },
  });

  const articles = data?.results ?? [];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Articles</h1>
          <p className="page-subtitle">Manage all articles across editions</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard/articles/new')}>
          <Plus size={16} /> New Article
        </button>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : articles.length === 0 ? (
        <div className="glass-card empty-state">
          <FileText size={48} />
          <p>No articles yet. Create articles from within an edition workspace.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {articles.map((article, i) => (
            <motion.div
              key={article.id}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: i * 0.04 }}
              className="glass-card"
              style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: 'pointer',
              }}
              onClick={() => {
                if (article.edition) {
                  navigate(`/editions/${article.edition}/articles/${article.id}`);
                }
              }}
            >
              <div style={{
                width: 4,
                height: 40,
                borderRadius: 2,
                background: CONFIG.priorities[article.priority as keyof typeof CONFIG.priorities]?.color || 'var(--color-border)',
                flexShrink: 0,
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: CONFIG.typography.headlineFont,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  marginBottom: 2,
                }}>
                  {article.headline}
                </div>
                {article.subheadline && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {article.subheadline}
                  </div>
                )}
              </div>

              <span className={`badge badge-${article.priority.toLowerCase()}`}>{article.priority}</span>

              {article.category_name && (
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-dim)',
                  padding: '2px 8px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: CONFIG.radius.sm,
                }}>
                  {article.category_name}
                </span>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete this article?')) deleteMutation.mutate(article.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
