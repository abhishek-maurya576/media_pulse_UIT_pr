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
  FileText,
  Save,
  X,
} from 'lucide-react';

export default function CategoryManager() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPageNum, setEditPageNum] = useState(0);

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) =>
      categoryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Page assignment saved!');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: categoryApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
  });

  const categories = data?.results ?? [];

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      display_order: categories.length,
    });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditPageNum(cat.page_number);
  };

  const savePageNum = (catId: number) => {
    updateMutation.mutate({ id: catId, data: { page_number: editPageNum } });
  };

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize articles by news sections — assign PDF page numbers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Category
        </button>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      {/* Info banner */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--color-bg-elevated)',
        borderRadius: CONFIG.radius.md,
        border: `1px solid var(--color-border)`,
        marginBottom: 16,
        fontSize: '0.8rem',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <FileText size={14} />
        <span>
          <strong>Page Number</strong> controls which PDF page this category's articles appear on.
          Set to <strong>0</strong> for auto-placement (last page).
        </span>
      </div>

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
                placeholder="Category name (e.g. राजनीति, खेल, तकनीक)"
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

              {/* Page number badge / editor */}
              {editingId === cat.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>Page:</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    max={20}
                    value={editPageNum}
                    onChange={e => setEditPageNum(parseInt(e.target.value) || 0)}
                    onKeyDown={e => e.key === 'Enter' && savePageNum(cat.id)}
                    style={{ width: 60, padding: '4px 8px', fontSize: '0.8rem', textAlign: 'center' }}
                    autoFocus
                  />
                  <button
                    className="btn btn-primary btn-sm btn-icon"
                    onClick={() => savePageNum(cat.id)}
                    style={{ padding: '4px 8px' }}
                  >
                    <Save size={12} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => setEditingId(null)}
                    style={{ padding: '4px 8px' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startEdit(cat)}
                  style={{
                    fontSize: '0.72rem',
                    color: cat.page_number > 0 ? CONFIG.colors.accent : 'var(--color-text-dim)',
                    padding: '3px 10px',
                    background: cat.page_number > 0 ? CONFIG.colors.accentGlow : 'var(--color-bg-elevated)',
                    borderRadius: CONFIG.radius.sm,
                    border: `1px solid ${cat.page_number > 0 ? CONFIG.colors.accent + '40' : 'var(--color-border)'}`,
                    cursor: 'pointer',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: `all ${CONFIG.animation.fast}`,
                  }}
                >
                  <FileText size={10} />
                  {cat.page_number > 0 ? `Page ${cat.page_number}` : 'Auto'}
                </button>
              )}

              <span style={{
                fontSize: '0.72rem',
                color: 'var(--color-text-dim)',
                padding: '2px 8px',
                background: 'var(--color-bg-elevated)',
                borderRadius: CONFIG.radius.sm,
              }}>
                Order: {cat.display_order}
              </span>

              {/* Delete */}
              <button
                className="btn btn-danger btn-sm btn-icon"
                onClick={() => {
                  if (confirm(`Delete "${cat.name}"?`)) deleteMutation.mutate(cat.id);
                }}
                style={{ padding: '4px 8px' }}
              >
                <Trash2 size={12} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
