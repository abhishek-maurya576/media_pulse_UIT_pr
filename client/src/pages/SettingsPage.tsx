import React from 'react';
import { CONFIG } from '../config';
import { useThemeStore } from '../store/themeStore';
import { Settings, Palette, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="page-container" style={{ maxWidth: 700 }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your Media Pulse workspace</p>
      </div>

      <div className="accent-line" style={{ marginBottom: 28 }} />

      {/* Settings sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* General */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: CONFIG.radius.md,
              background: CONFIG.colors.primaryGlow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Globe size={18} color={CONFIG.colors.primary} />
            </div>
            <div>
              <h3 style={{ fontFamily: CONFIG.typography.headlineFont, fontSize: '1rem', fontWeight: 600 }}>General</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Newspaper name, defaults</p>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Default Newspaper Name</label>
            <input className="input" defaultValue="Media Pulse" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Default Page Size</label>
              <select className="input" defaultValue="TABLOID">
                {Object.entries(CONFIG.pageSizes).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Default Style</label>
              <select className="input" defaultValue="DEFAULT">
                {Object.entries(CONFIG.stylePresets).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: CONFIG.radius.md,
              background: CONFIG.colors.accentGlow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Palette size={18} color={CONFIG.colors.accent} />
            </div>
            <div>
              <h3 style={{ fontFamily: CONFIG.typography.headlineFont, fontSize: '1rem', fontWeight: 600 }}>Appearance</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Theme and visual preferences</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setTheme('dark')}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: CONFIG.radius.md,
                border: theme === 'dark' ? `2px solid ${CONFIG.colors.accent}` : `1px solid var(--color-border)`,
                background: theme === 'dark' ? CONFIG.colors.accentGlow : 'transparent',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dark Mode</div>
              <div style={{ fontSize: '0.72rem', color: theme === 'dark' ? CONFIG.colors.accent : 'var(--color-text-dim)' }}>
                {theme === 'dark' ? 'Active' : 'Select'}
              </div>
            </button>
            <button
              onClick={() => setTheme('light')}
              style={{
                flex: 1,
                padding: 16,
                borderRadius: CONFIG.radius.md,
                border: theme === 'light' ? `2px solid ${CONFIG.colors.accent}` : `1px solid var(--color-border)`,
                background: theme === 'light' ? CONFIG.colors.accentGlow : 'transparent',
                textAlign: 'center',
                cursor: 'pointer',
                color: 'var(--color-text)',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Light Mode</div>
              <div style={{ fontSize: '0.72rem', color: theme === 'light' ? CONFIG.colors.accent : 'var(--color-text-dim)' }}>
                {theme === 'light' ? 'Active' : 'Select'}
              </div>
            </button>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button className="btn btn-primary btn-lg">
            <Settings size={16} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
