import React from 'react';
import { CONFIG } from '../config';
import { LayoutTemplate, Plus } from 'lucide-react';

export default function TemplateManager() {
  const templates = [
    { name: 'Classic Broadsheet', description: 'Traditional newspaper layout with hero, major, and minor article slots', active: true },
    { name: 'Modern Magazine', description: 'Clean magazine-style grid with large images and minimal text', active: false },
    { name: 'Compact Daily', description: 'Dense layout optimized for maximum article count per page', active: false },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 800 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Manage newspaper layout templates</p>
        </div>
        <button className="btn btn-accent" disabled>
          <Plus size={16} /> Custom Template (Coming Soon)
        </button>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
        {templates.map((tmpl, i) => (
          <div
            key={i}
            className={tmpl.active ? 'glass-card-accent' : 'glass-card'}
            style={{ padding: 24, position: 'relative' }}
          >
            {tmpl.active && (
              <div style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: '2px 8px',
                background: `${CONFIG.colors.accent}20`,
                color: CONFIG.colors.accent,
                borderRadius: CONFIG.radius.pill,
                fontSize: '0.68rem',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}>
                Active
              </div>
            )}
            <div style={{
              width: '100%',
              height: 120,
              background: 'var(--color-bg-elevated)',
              borderRadius: CONFIG.radius.md,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid var(--color-border)`,
            }}>
              <LayoutTemplate size={32} color={'var(--color-text-dim)'} />
            </div>
            <h3 style={{
              fontFamily: CONFIG.typography.headlineFont,
              fontSize: '1rem',
              fontWeight: 600,
              marginBottom: 6,
            }}>
              {tmpl.name}
            </h3>
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.4,
            }}>
              {tmpl.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
