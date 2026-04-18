import React from 'react';
import { CONFIG } from '../config';
import { Image, Upload, FolderOpen } from 'lucide-react';

export default function MediaLibrary() {
  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Media Library</h1>
          <p className="page-subtitle">Manage images and media assets</p>
        </div>
        <button className="btn btn-primary">
          <Upload size={16} /> Upload Media
        </button>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      {/* Upload zone */}
      <div
        className="glass-card"
        style={{
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px dashed var(--color-border)`,
          borderRadius: CONFIG.radius.xl,
          cursor: 'pointer',
          transition: `all ${CONFIG.animation.normal}`,
          marginBottom: 24,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = CONFIG.colors.accent;
          e.currentTarget.style.background = CONFIG.colors.accentGlow;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.background = 'var(--color-bg-card)';
        }}
      >
        <Upload size={40} color={'var(--color-text-dim)'} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: '0.95rem', fontWeight: 500, marginBottom: 4 }}>
          Drop files here or click to upload
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
          Supports JPG, PNG, WebP up to 10MB
        </p>
      </div>

      {/* Empty state */}
      <div className="glass-card empty-state">
        <Image size={48} />
        <p>No media files yet. Upload images to use in your articles and editions.</p>
      </div>
    </div>
  );
}
