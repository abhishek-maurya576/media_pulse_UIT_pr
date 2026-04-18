import React from 'react';
import { motion } from 'framer-motion';
import { CONFIG } from '../config';
import { Eye, Newspaper } from 'lucide-react';

interface ArticlePlacement {
  id: string;
  headline: string;
  subheadline?: string;
  byline?: string;
  priority: string;
  category_name?: string;
  columns: number;
}

interface EditionPreviewProps {
  articles: ArticlePlacement[];
  newspaperName?: string;
  publicationDate?: string;
  editionNumber?: number;
}

const PRIORITY_COLUMNS: Record<string, number> = {
  HERO: 6,
  MAJOR: 3,
  STANDARD: 2,
  MINOR: 1,
};

export default function EditionPreview({
  articles,
  newspaperName = 'Media Puls',
  publicationDate = new Date().toLocaleDateString(),
  editionNumber = 1,
}: EditionPreviewProps) {
  const placements = articles.map(a => ({
    ...a,
    columns: PRIORITY_COLUMNS[a.priority] || 2,
  }));

  // Group into rows (6 columns per row)
  const rows: ArticlePlacement[][] = [];
  let currentRow: ArticlePlacement[] = [];
  let currentCols = 0;

  for (const p of placements) {
    if (currentCols + p.columns > 6) {
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = [p];
      currentCols = p.columns;
    } else {
      currentRow.push(p);
      currentCols += p.columns;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  if (articles.length === 0) {
    return (
      <div className="glass-card empty-state" style={{ padding: 48 }}>
        <Eye size={48} />
        <p>Add articles to see a layout preview</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        background: '#FDFAF2',
        borderRadius: CONFIG.radius.lg,
        padding: 32,
        color: '#1a1a1a',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        boxShadow: CONFIG.shadows.elevated,
        maxWidth: 800,
        margin: '0 auto',
      }}
    >
      {/* Masthead */}
      <div style={{
        textAlign: 'center',
        paddingBottom: 12,
        marginBottom: 16,
        borderBottom: '4px double #1a1a1a',
      }}>
        <div style={{
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          lineHeight: 1.1,
          marginBottom: 4,
        }}>
          {newspaperName}
        </div>
        <div style={{
          fontSize: '0.65rem',
          color: '#666',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          {publicationDate} &bull; Edition #{editionNumber}
        </div>
        <div style={{
          height: 3,
          background: CONFIG.colors.primary,
          marginTop: 8,
          borderRadius: 2,
        }} />
      </div>

      {/* Article Grid */}
      {rows.map((row, ri) => (
        <div
          key={ri}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 12,
            marginBottom: 12,
          }}
        >
          {row.map((article, ai) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (ri * row.length + ai) * 0.05 }}
              style={{
                gridColumn: `span ${article.columns}`,
                padding: article.columns >= 6 ? '16px 0' : '12px 10px',
                borderRight: ai < row.length - 1 ? '0.5px solid #ddd' : 'none',
                paddingRight: ai < row.length - 1 ? 10 : 0,
              }}
            >
              {/* Category */}
              {article.category_name && (
                <div style={{
                  fontSize: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: CONFIG.colors.primary,
                  fontWeight: 700,
                  marginBottom: 3,
                }}>
                  {article.category_name}
                </div>
              )}

              {/* Headline */}
              <h3 style={{
                fontSize: article.columns >= 6 ? '1.4rem' : article.columns >= 3 ? '1rem' : '0.8rem',
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: 4,
                color: '#0E0E0E',
              }}>
                {article.headline}
              </h3>

              {/* Subheadline */}
              {article.subheadline && article.columns >= 2 && (
                <p style={{
                  fontSize: '0.65rem',
                  fontStyle: 'italic',
                  color: '#555',
                  marginBottom: 4,
                  lineHeight: 1.3,
                }}>
                  {article.subheadline}
                </p>
              )}

              {/* Byline */}
              {article.byline && (
                <div style={{
                  fontSize: '0.5rem',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 6,
                  paddingBottom: 4,
                  borderBottom: '0.5px solid #eee',
                }}>
                  By {article.byline}
                </div>
              )}

              {/* Content placeholder */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {Array.from({ length: article.columns >= 6 ? 4 : article.columns >= 3 ? 3 : 2 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      height: 6,
                      background: '#e0dcd4',
                      borderRadius: 2,
                      width: i === (article.columns >= 6 ? 3 : article.columns >= 3 ? 2 : 1) ? '70%' : '100%',
                    }}
                  />
                ))}
              </div>

              {/* Priority badge */}
              <div style={{
                marginTop: 8,
                display: 'inline-block',
                fontSize: '0.45rem',
                padding: '1px 6px',
                borderRadius: 3,
                background: `${CONFIG.priorities[article.priority as keyof typeof CONFIG.priorities]?.color || '#999'}20`,
                color: CONFIG.priorities[article.priority as keyof typeof CONFIG.priorities]?.color || '#999',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontFamily: CONFIG.typography.bodyFont,
              }}>
                {article.priority}
              </div>
            </motion.div>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.5rem',
        color: '#aaa',
        paddingTop: 10,
        borderTop: '0.5px solid #ddd',
        marginTop: 8,
      }}>
        {newspaperName} — Page 1 &bull; Preview
      </div>
    </motion.div>
  );
}
