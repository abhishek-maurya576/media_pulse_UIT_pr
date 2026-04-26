import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { articleApi, categoryApi, editionApi, type ArticleCreate } from '../api/client';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Save,
  Trash2,
  AlertCircle,
  Star,
  Columns3,
  Columns2,
  AlignJustify,
  Crown,
  Sparkles,
  Loader,
  Upload,
  ImagePlus,
  X,
} from 'lucide-react';

const priorityOptions = [
  { value: 'HERO', label: 'Hero (Full Width)', icon: Crown, color: CONFIG.priorities.HERO.color },
  { value: 'MAJOR', label: 'Major (3 Columns)', icon: Columns3, color: CONFIG.priorities.MAJOR.color },
  { value: 'STANDARD', label: 'Standard (2 Columns)', icon: Columns2, color: CONFIG.priorities.STANDARD.color },
  { value: 'MINOR', label: 'Minor (1 Column)', icon: AlignJustify, color: CONFIG.priorities.MINOR.color },
];

const emptyArticle: ArticleCreate = {
  edition: '',
  headline: '',
  subheadline: '',
  byline: '',
  content_raw: '',
  content_format: 'PLAINTEXT',
  category: null,
  priority: 'STANDARD',
  highlights: [],
  highlights_mode: 'NONE',
  image: null,
  image_caption: '',
  order: 0,
};

export default function ArticleEditor() {
  const { editionId, articleId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !articleId;

  const [form, setForm] = useState<ArticleCreate>({ ...emptyArticle, edition: editionId || '' });
  const [highlightInput, setHighlightInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const { data: existingArticle } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articleApi.get(articleId!),
    enabled: !isNew,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.list,
  });
  const categories = categoriesData?.results ?? [];

  // Fetch editions list when no editionId is in the URL (standalone article creation)
  const { data: editionsData } = useQuery({
    queryKey: ['editions'],
    queryFn: editionApi.list,
    enabled: !editionId,
  });
  const editions = editionsData?.results ?? [];

  useEffect(() => {
    if (existingArticle) {
      setForm({
        edition: existingArticle.edition,
        headline: existingArticle.headline,
        subheadline: existingArticle.subheadline,
        byline: existingArticle.byline,
        content_raw: existingArticle.content_raw || '',
        content_format: existingArticle.content_format,
        category: existingArticle.category,
        priority: existingArticle.priority,
        highlights: existingArticle.highlights || [],
        highlights_mode: existingArticle.highlights_mode,
        image: existingArticle.image,
        image_caption: existingArticle.image_caption,
        order: existingArticle.order,
      });
    }
  }, [existingArticle]);

  const createMutation = useMutation({
    mutationFn: (data: ArticleCreate) => articleApi.create(data),
    onSuccess: async (createdArticle) => {
      const targetEdition = editionId || form.edition;

      // Chain pending image upload if user attached a file during creation
      if (pendingImageFile) {
        try {
          await articleApi.uploadImage(createdArticle.id, pendingImageFile);
          // Also persist image_caption if provided
          if (form.image_caption.trim()) {
            await articleApi.update(createdArticle.id, { image_caption: form.image_caption });
          }
          toast.success('Article created with image!');
        } catch {
          toast.success('Article created, but image upload failed. You can re-attach it.');
        }
        setPendingImageFile(null);
      } else {
        toast.success('Article created!');
      }

      queryClient.invalidateQueries({ queryKey: ['edition-articles', targetEdition] });
      queryClient.invalidateQueries({ queryKey: ['edition', targetEdition] });
      navigate(editionId ? `/editions/${editionId}` : '/dashboard/articles');
    },
    onError: () => toast.error('Failed to create article'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ArticleCreate>) => articleApi.update(articleId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edition-articles', editionId] });
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      toast.success('Article updated!');
      navigate(editionId ? `/editions/${editionId}` : '/dashboard/articles');
    },
    onError: () => toast.error('Failed to update article'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => articleApi.delete(articleId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edition-articles', editionId] });
      toast.success('Article deleted');
      navigate(editionId ? `/editions/${editionId}` : '/dashboard/articles');
    },
  });

  const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.edition) { toast.error('Please select an edition'); return; }
    if (!form.headline.trim()) { toast.error('Headline is required'); return; }
    if (!form.content_raw.trim()) { toast.error('Content is required'); return; }
    // Strip image field — images are uploaded via separate endpoint
    const { image, ...payload } = form;
    if (isNew) createMutation.mutate(payload as ArticleCreate);
    else updateMutation.mutate(payload);
  };

  const addHighlight = () => {
    if (highlightInput.trim()) {
      update('highlights', [...form.highlights, highlightInput.trim()]);
      setHighlightInput('');
    }
  };

  const removeHighlight = (index: number) => {
    update('highlights', form.highlights.filter((_, i) => i !== index));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const generateHighlightsMutation = useMutation({
    mutationFn: () => articleApi.generateHighlights(articleId!),
    onSuccess: (data) => {
      if (data.count === 0) {
        toast.error('Content is too short to extract highlights. Add more text.');
        return;
      }
      update('highlights', data.highlights);
      update('highlights_mode', data.mode);
      toast.success(`Generated ${data.count} highlight${data.count > 1 ? 's' : ''}`);
    },
    onError: () => toast.error('Failed to generate highlights'),
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => articleApi.uploadImage(articleId!, file),
    onSuccess: (data) => {
      update('image', data.image);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      toast.success('Image uploaded');
    },
    onError: () => toast.error('Failed to upload image'),
  });

  const removeImageMutation = useMutation({
    mutationFn: () => articleApi.removeImage(articleId!),
    onSuccess: () => {
      update('image', null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['article', articleId] });
      toast.success('Image removed');
    },
  });

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleImageFile(file);
    } else {
      toast.error('Please drop an image file');
    }
  };

  const handleImageFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    if (isNew) {
      // Store file — will be uploaded after article creation
      setPendingImageFile(file);
    } else {
      uploadImageMutation.mutate(file);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      {/* Breadcrumb */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate(editionId ? `/editions/${editionId}` : '/dashboard/articles')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} /> {editionId ? 'Back to Edition' : 'Back to Articles'}
      </button>

      <motion.div
        className="glass-card"
        style={{ padding: 32 }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: CONFIG.typography.headlineFont,
            fontSize: '1.4rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            {isNew ? <><Star size={22} color={CONFIG.colors.accent} /> New Article</> : <><Save size={22} color={CONFIG.colors.accent} /> Edit Article</>}
          </h1>
          {!isNew && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { if (confirm('Delete this article?')) deleteMutation.mutate(); }}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>

        {/* Edition Selector — shown when creating article outside an edition */}
        {!editionId && isNew && (
          <div className="form-group">
            <label className="form-label">Edition *</label>
            <select
              className="input"
              value={form.edition}
              onChange={e => update('edition', e.target.value)}
              style={{
                borderColor: !form.edition ? CONFIG.colors.danger : undefined,
              }}
            >
              <option value="">-- Select Edition --</option>
              {editions.map(ed => (
                <option key={ed.id} value={ed.id}>
                  {ed.name} — #{ed.edition_number} ({ed.publication_date})
                </option>
              ))}
            </select>
            {editions.length === 0 && (
              <p style={{ fontSize: '0.78rem', color: CONFIG.colors.danger, marginTop: 4 }}>
                No editions found. Please create an edition first.
              </p>
            )}
          </div>
        )}

        {/* Headline */}
        <div className="form-group">
          <label className="form-label">Headline *</label>
          <input
            className="input"
            placeholder="Enter article headline..."
            value={form.headline}
            onChange={e => update('headline', e.target.value)}
            style={{
              fontSize: '1.1rem',
              fontFamily: CONFIG.typography.headlineFont,
              fontWeight: 600,
              padding: '14px',
            }}
          />
        </div>

        {/* Subheadline */}
        <div className="form-group">
          <label className="form-label">Subheadline</label>
          <input
            className="input"
            placeholder="Optional subheadline..."
            value={form.subheadline}
            onChange={e => update('subheadline', e.target.value)}
          />
        </div>

        {/* Byline + Priority + Order */}
        <div className="form-row-3">
          <div className="form-group">
            <label className="form-label">Byline</label>
            <input className="input" placeholder="Author name" value={form.byline} onChange={e => update('byline', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select className="input" value={form.priority} onChange={e => update('priority', e.target.value)}>
              {priorityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Order</label>
            <input className="input" type="number" min={0} value={form.order} onChange={e => update('order', parseInt(e.target.value) || 0)} />
          </div>
        </div>

        {/* Priority visual indicator */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 20,
          padding: '10px 14px',
          background: 'var(--color-bg-elevated)',
          borderRadius: CONFIG.radius.md,
          border: `1px solid var(--color-border)`,
        }}>
          {priorityOptions.map(opt => {
            const isActive = form.priority === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => update('priority', opt.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: CONFIG.radius.sm,
                  border: `1px solid ${isActive ? opt.color : 'transparent'}`,
                  background: isActive ? `${opt.color}15` : 'transparent',
                  color: isActive ? opt.color : 'var(--color-text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 400,
                  transition: `all ${CONFIG.animation.fast}`,
                }}
              >
                <Icon size={14} /> {opt.value}
              </button>
            );
          })}
        </div>

        {/* Category + Format */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="input" value={form.category || ''} onChange={e => update('category', e.target.value ? parseInt(e.target.value) : null)}>
              <option value="">-- No Category --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Content Format</label>
            <select className="input" value={form.content_format} onChange={e => update('content_format', e.target.value)}>
              {Object.entries(CONFIG.contentFormats).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="form-group">
          <label className="form-label">Content *</label>
          <textarea
            className="input"
            placeholder="Write your article content here..."
            value={form.content_raw}
            onChange={e => update('content_raw', e.target.value)}
            style={{
              minHeight: 240,
              fontFamily: form.content_format !== 'PLAINTEXT' ? 'monospace' : 'inherit',
            }}
          />
        </div>

        {/* Highlights */}
        <div className="form-group">
          <label className="form-label">Key Highlights</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              className="input"
              placeholder="Add a highlight point..."
              value={highlightInput}
              onChange={e => setHighlightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addHighlight()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-accent" onClick={addHighlight}>Add</button>
            {!isNew && (
              <button
                className="btn btn-secondary"
                onClick={() => generateHighlightsMutation.mutate()}
                disabled={generateHighlightsMutation.isPending || !form.content_raw.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {generateHighlightsMutation.isPending ? (
                  <Loader size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} />
                )}
                Auto-Generate
              </button>
            )}
          </div>
          {form.highlights.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {form.highlights.map((h, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: 'var(--color-bg-elevated)',
                    borderRadius: CONFIG.radius.sm,
                    fontSize: '0.85rem',
                    borderLeft: `3px solid ${CONFIG.colors.accent}`,
                  }}
                >
                  <Star size={12} color={CONFIG.colors.accent} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{h}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeHighlight(i)} style={{ padding: 4 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image Upload */}
        <div className="form-group">
          <label className="form-label">Featured Image</label>

          {/* Image preview or upload zone */}
          {(form.image || imagePreview) ? (
            <div style={{
              position: 'relative',
              borderRadius: CONFIG.radius.md,
              overflow: 'hidden',
              border: `1px solid var(--color-border)`,
            }}>
              <img
                src={imagePreview || (form.image as string)}
                alt="Preview"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 6,
              }}>
                {uploadImageMutation.isPending && (
                  <div style={{
                    padding: '6px 12px',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: CONFIG.radius.sm,
                    fontSize: '0.75rem',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    <Loader size={12} className="animate-spin" /> Uploading...
                  </div>
                )}
                {isNew && pendingImageFile && (
                  <div style={{
                    padding: '4px 10px',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: CONFIG.radius.sm,
                    fontSize: '0.7rem',
                    color: CONFIG.colors.accent,
                    fontWeight: 600,
                  }}>
                    Will upload on save
                  </div>
                )}
                {(isNew ? !!pendingImageFile : !!form.image) && (
                  <button
                    onClick={() => {
                      if (isNew) {
                        setPendingImageFile(null);
                        setImagePreview(null);
                      } else {
                        removeImageMutation.mutate();
                      }
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(193, 18, 31, 0.9)',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleImageDrop}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleImageFile(file);
                };
                input.click();
              }}
              style={{
                border: `2px dashed ${dragActive ? CONFIG.colors.accent : 'var(--color-border)'}`,
                borderRadius: CONFIG.radius.md,
                padding: '36px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: `all ${CONFIG.animation.fast}`,
                background: dragActive ? CONFIG.colors.accentGlow : 'transparent',
              }}
            >
              <ImagePlus size={32} color={dragActive ? CONFIG.colors.accent : 'var(--color-text-dim)'} style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Drag & drop an image or click to browse
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', margin: '4px 0 0' }}>
                JPEG, PNG, WebP, GIF. Max 10MB
              </p>
            </div>
          )}

          {/* Caption */}
          <input
            className="input"
            placeholder="Optional image caption..."
            value={form.image_caption}
            onChange={e => update('image_caption', e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'flex-end',
          marginTop: 28,
          paddingTop: 20,
          borderTop: `1px solid var(--color-border)`,
        }}>
          <button className="btn btn-secondary" onClick={() => navigate(editionId ? `/editions/${editionId}` : '/dashboard/articles')}>
            Cancel
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <div className="spinner" style={{ width: 16, height: 16 }} />
            ) : (
              <Save size={16} />
            )}
            {isNew ? 'Create Article' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
