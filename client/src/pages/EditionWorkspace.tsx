import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { editionApi, articleApi, type ArticleListItem } from '../api/client';
import EditionPreview from '../components/EditionPreview';
import { CONFIG } from '../config';
import toast from 'react-hot-toast';
import {
  Plus,
  FileDown,
  ArrowLeft,
  Trash2,
  Edit3,
  Newspaper,
  Loader,
  Download,
  Eye,
  GripVertical,
  List,
} from 'lucide-react';

// ─── Sortable Article Row ───
function SortableArticle({
  article,
  editionId,
  onDelete,
  onNavigate,
}: {
  article: ArticleListItem;
  editionId: string;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: article.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto' as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass-card"
      onClick={() => onNavigate(`/editions/${editionId}/articles/${article.id}`)}
      {...attributes}
    >
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
      }}>
        {/* Drag handle */}
        <div
          {...listeners}
          style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} color={'var(--color-text-dim)'} />
        </div>

        {/* Priority indicator */}
        <div style={{
          width: 4,
          height: 40,
          borderRadius: 2,
          background: CONFIG.priorities[article.priority as keyof typeof CONFIG.priorities]?.color || 'var(--color-border)',
          flexShrink: 0,
        }} />

        {/* Order badge */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: CONFIG.radius.sm,
          background: 'var(--color-bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--color-text-muted)',
          flexShrink: 0,
        }}>
          {article.order}
        </div>

        {/* Content */}
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

        {/* Meta */}
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/editions/${editionId}/articles/${article.id}`);
            }}
          >
            <Edit3 size={14} />
          </button>
          <button
            className="btn btn-danger btn-sm btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this article?')) onDelete(article.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Workspace ───
export default function EditionWorkspace() {
  const { editionId } = useParams<{ editionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'preview'>('list');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const { data: edition, isLoading } = useQuery({
    queryKey: ['edition', editionId],
    queryFn: () => editionApi.get(editionId!),
    enabled: !!editionId,
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['edition-articles', editionId],
    queryFn: () => editionApi.getArticles(editionId!),
    enabled: !!editionId,
  });

  const generatePdf = useMutation({
    mutationFn: () => editionApi.generatePdf(editionId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edition', editionId] });
      toast.success('PDF generated successfully!');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'PDF generation failed');
    },
  });

  const deleteArticle = useMutation({
    mutationFn: articleApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edition-articles', editionId] });
      queryClient.invalidateQueries({ queryKey: ['edition', editionId] });
      toast.success('Article deleted');
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = articles.findIndex(a => a.id === active.id);
    const newIndex = articles.findIndex(a => a.id === over.id);

    const reordered = arrayMove(articles, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(['edition-articles', editionId], reordered);

    // Build bulk order payload and send single request
    const orders = reordered.map((article, index) => ({
      id: article.id,
      order: index + 1,
    }));

    articleApi.bulkReorder(orders).catch(() => {
      // Revert optimistic update on failure
      queryClient.invalidateQueries({ queryKey: ['edition-articles', editionId] });
    });
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="page-container empty-state">
        <p>Edition not found</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Go back</button>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Breadcrumb */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => navigate('/')}
        style={{ marginBottom: 16 }}
      >
        <ArrowLeft size={16} /> Back to Editions
      </button>

      {/* Edition Header */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          padding: 28,
          marginBottom: 24,
          borderTop: `3px solid ${CONFIG.colors.primary}`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <h1 style={{
                fontFamily: CONFIG.typography.headlineFont,
                fontSize: '1.5rem',
                fontWeight: 700,
              }}>
                {edition.name}
              </h1>
              <span className={`badge badge-${edition.status.toLowerCase()}`}>{edition.status}</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {edition.newspaper_name} &bull; Edition #{edition.edition_number} &bull; {edition.publication_date} &bull; {edition.page_size}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {edition.generated_pdf && (
              <a
                href={edition.generated_pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <Download size={16} /> Download PDF
              </a>
            )}
            <button
              className="btn btn-primary"
              onClick={() => generatePdf.mutate()}
              disabled={generatePdf.isPending || articles.length === 0}
            >
              {generatePdf.isPending ? (
                <><Loader size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><FileDown size={16} /> Generate PDF</>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* View Toggle + Article Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: '1.2rem',
          fontWeight: 600,
        }}>
          Articles <span style={{ color: 'var(--color-text-dim)', fontWeight: 400 }}>({articles.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* View Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--color-bg-elevated)',
            borderRadius: CONFIG.radius.md,
            border: `1px solid var(--color-border)`,
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 14px',
                background: viewMode === 'list' ? CONFIG.colors.accentGlow : 'transparent',
                border: 'none',
                color: viewMode === 'list' ? CONFIG.colors.accent : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: viewMode === 'list' ? 600 : 400,
              }}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setViewMode('preview')}
              style={{
                padding: '6px 14px',
                background: viewMode === 'preview' ? CONFIG.colors.accentGlow : 'transparent',
                border: 'none',
                color: viewMode === 'preview' ? CONFIG.colors.accent : 'var(--color-text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: viewMode === 'preview' ? 600 : 400,
              }}
            >
              <Eye size={14} /> Preview
            </button>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/editions/${editionId}/articles/new`)}
          >
            <Plus size={16} /> Add Article
          </button>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {viewMode === 'preview' ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <EditionPreview
              articles={articles.map(a => ({
                id: a.id,
                headline: a.headline,
                subheadline: a.subheadline,
                byline: a.byline,
                priority: a.priority,
                category_name: a.category_name,
                columns: 2,
              }))}
              newspaperName={edition.newspaper_name}
              publicationDate={edition.publication_date}
              editionNumber={edition.edition_number}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {articles.length === 0 ? (
              <div className="glass-card empty-state">
                <Newspaper size={48} />
                <p>No articles yet. Add your first article to start composing.</p>
                <button className="btn btn-primary" onClick={() => navigate(`/editions/${editionId}/articles/new`)}>
                  <Plus size={16} /> Add Article
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={articles.map(a => a.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {articles.map((article) => (
                      <SortableArticle
                        key={article.id}
                        article={article}
                        editionId={editionId!}
                        onDelete={(id) => deleteArticle.mutate(id)}
                        onNavigate={navigate}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
