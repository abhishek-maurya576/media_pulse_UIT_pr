import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { categoryApi, type Category } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import {
  Plus,
  FolderOpen,
  Trash2,
  GripVertical,
  Edit3,
} from 'lucide-react';

export default function CategoryManager() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });

  const createMutation = useMutation({
    mutationFn: categoryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created!');
      setNewName('');
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create category'),
  });

  const categories = data?.results ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      display_order: categories.length,
    });
  };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize articles by news sections</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      {/* Create inline form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card-accent"
            style={{ padding: 20, marginBottom: 16, overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                className="input"
                placeholder="Category name (e.g. Politics, Sports, Technology)"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                autoFocus
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleCreate} disabled={!newName.trim()}>
                <Plus size={16} /> Create
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowCreate(false); setNewName(''); }}>
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-card empty-state">
          <FolderOpen size={48} />
          <p>No categories yet. Create categories to organize your articles by news sections.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Category
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card"
              style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <GripVertical size={16} color={'var(--color-text-dim)'} style={{ cursor: 'grab' }} />
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: CONFIG.colors.accent,
                flexShrink: 0,
              }} />
              <span style={{
                flex: 1,
                fontSize: '0.9rem',
                fontWeight: 500,
              }}>
                {cat.name}
              </span>
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--color-text-dim)',
                padding: '2px 8px',
                background: 'var(--color-bg-elevated)',
                borderRadius: CONFIG.radius.sm,
              }}>
                Order: {cat.display_order}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
