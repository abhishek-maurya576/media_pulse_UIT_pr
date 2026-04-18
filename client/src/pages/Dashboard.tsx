import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { editionApi, templateApi, type Edition, type EditionCreate } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import {
  Plus,
  Newspaper,
  Calendar,
  FileText,
  Trash2,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  PenLine,
} from 'lucide-react';

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['editions'],
    queryFn: editionApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: editionApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editions'] });
      toast.success('Edition deleted');
    },
  });

  const editions = data?.results ?? [];

  const stats = [
    {
      label: 'Total Editions',
      value: editions.length,
      icon: Newspaper,
      bg: `${CONFIG.colors.primaryGlow}`,
      iconColor: CONFIG.colors.primary,
    },
    {
      label: 'Draft',
      value: editions.filter(e => e.status === 'DRAFT').length,
      icon: PenLine,
      bg: 'rgba(154, 149, 137, 0.1)',
      iconColor: 'var(--color-text-muted)',
    },
    {
      label: 'Completed',
      value: editions.filter(e => e.status === 'COMPLETED').length,
      icon: CheckCircle2,
      bg: 'rgba(52, 211, 153, 0.1)',
      iconColor: CONFIG.colors.success,
    },
    {
      label: 'Total Articles',
      value: editions.reduce((sum, e) => sum + (e.article_count || 0), 0),
      icon: FileText,
      bg: CONFIG.colors.accentGlow,
      iconColor: CONFIG.colors.accent,
    },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Editions</h1>
          <p className="page-subtitle">Create and manage your newspaper editions</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Edition
        </button>
      </div>

      {/* Accent divider */}
      <div className="accent-line" style={{ marginBottom: 28 }} />

      {/* Stats Row */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}
      >
        {stats.map(({ label, value, icon: Icon, bg, iconColor }) => (
          <motion.div key={label} variants={fadeUp} className="stat-card">
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={22} color={iconColor} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Edition Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 180 }} />
          ))}
        </div>
      ) : editions.length === 0 ? (
        <div className="glass-card empty-state">
          <Newspaper size={48} />
          <p>No editions yet. Create your first newspaper edition to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Create Edition
          </button>
        </div>
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}
        >
          {editions.map((edition) => (
            <motion.div
              key={edition.id}
              variants={fadeUp}
              className="glass-card"
              style={{ padding: 24, cursor: 'pointer' }}
              onClick={() => navigate(`/editions/${edition.id}`)}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{
                    fontFamily: CONFIG.typography.headlineFont,
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    marginBottom: 4,
                  }}>
                    {edition.name}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {edition.newspaper_name}
                  </p>
                </div>
                <span className={`badge badge-${edition.status.toLowerCase()}`}>{edition.status}</span>
              </div>

              <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} /> {edition.publication_date}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} /> #{edition.edition_number}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Newspaper size={14} /> {edition.article_count || 0} articles
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{edition.page_size}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this edition?')) deleteMutation.mutate(edition.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/editions/${edition.id}`); }}
                  >
                    Open <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && <CreateEditionModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function CreateEditionModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [form, setForm] = useState<EditionCreate>({
    name: '',
    newspaper_name: 'बी.आर.टाइम्स',
    edition_number: 1,
    publication_date: new Date().toISOString().split('T')[0],
    page_size: 'TABLOID',
    layout_mode: 'FIXED_TEMPLATE',
    style_preset: 'DEFAULT',
    chief_editor: 'बलराम दीक्षित',
    inspiration_source: 'स्व0 सूर्यनारायण त्रिपाठी',
  });

  // Fetch active template to auto-set style_preset
  const { data: templatesResp } = useQuery({
    queryKey: ['templates'],
    queryFn: templateApi.list,
  });

  const allTemplates = templatesResp?.results || [];
  const activeTemplate = allTemplates.find(t => t.is_active);
  const activePreset = activeTemplate?.layout_definition?.style_preset || 'DEFAULT';

  // Auto-set style_preset from active template on first load
  React.useEffect(() => {
    if (activeTemplate) {
      setForm(prev => ({ ...prev, style_preset: activePreset }));
    }
  }, [activePreset]);

  const PRESET_COLORS: Record<string, string> = {
    DEFAULT: '#C1121F',
    CLASSIC: '#8B0000',
    MODERN: '#E63946',
  };

  const mutation = useMutation({
    mutationFn: editionApi.create,
    onSuccess: (edition) => {
      queryClient.invalidateQueries({ queryKey: ['editions'] });
      toast.success('Edition created!');
      onClose();
      navigate(`/editions/${edition.id}`);
    },
    onError: () => toast.error('Failed to create edition'),
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: '1.3rem',
          fontWeight: 700,
          marginBottom: 24,
        }}>
          Create New Edition
        </h2>

        <div className="form-group">
          <label className="form-label">Edition Name</label>
          <input className="input" placeholder="e.g. Morning Edition" value={form.name} onChange={e => update('name', e.target.value)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Newspaper Name</label>
            <input className="input" value={form.newspaper_name} onChange={e => update('newspaper_name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Edition Number</label>
            <input className="input" type="number" min={1} value={form.edition_number} onChange={e => update('edition_number', parseInt(e.target.value) || 1)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Publication Date</label>
            <input className="input" type="date" value={form.publication_date} onChange={e => update('publication_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Page Size</label>
            <select className="input" value={form.page_size} onChange={e => update('page_size', e.target.value)}>
              {Object.entries(CONFIG.pageSizes).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Masthead fields */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">प्रधान सम्पादक (Chief Editor)</label>
            <input className="input" value={form.chief_editor} onChange={e => update('chief_editor', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">प्रेरणा स्रोत (Inspiration Source)</label>
            <input className="input" value={form.inspiration_source} onChange={e => update('inspiration_source', e.target.value)} />
          </div>
        </div>

        {/* Template / Style Preset — driven by templates */}
        <div className="form-group">
          <label className="form-label">Template (Style Preset)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              className="input"
              style={{ flex: 1 }}
              value={form.style_preset}
              onChange={e => update('style_preset', e.target.value)}
            >
              {allTemplates.length > 0 ? (
                allTemplates.map(t => {
                  const preset = t.layout_definition?.style_preset || 'DEFAULT';
                  return (
                    <option key={t.id} value={preset}>
                      {t.name} ({preset})
                    </option>
                  );
                })
              ) : (
                Object.entries(CONFIG.stylePresets).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))
              )}
            </select>
            <div style={{
              width: 18, height: 18, borderRadius: 4,
              background: PRESET_COLORS[form.style_preset] || '#C1121F',
              border: '1px solid var(--color-border)',
              flexShrink: 0,
            }} />
          </div>
          <div style={{
            marginTop: 6, fontSize: '0.72rem',
            color: 'var(--color-text-muted)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {activeTemplate && (
              <>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: CONFIG.colors.success,
                }} />
                Active: <strong>{activeTemplate.name}</strong>
                {form.style_preset !== activePreset && (
                  <span style={{ color: CONFIG.colors.warning }}>(overridden)</span>
                )}
                <span style={{ color: 'var(--color-text-dim)' }}>|</span>
              </>
            )}
            <button
              onClick={() => { onClose(); navigate('/dashboard/templates'); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: CONFIG.colors.accent, fontSize: '0.72rem',
                textDecoration: 'underline', padding: 0,
              }}
            >
              Manage Templates
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || mutation.isPending}
          >
            {mutation.isPending ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <Plus size={16} />}
            Create Edition
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
