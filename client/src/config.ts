/**
 * Media Pulse — Centralized Configuration
 *
 * Single source of truth for colors, typography, spacing, API endpoints,
 * and all global variables. Change here → propagates everywhere.
 *
 * Theme system: THEMES object defines dark/light color palettes.
 * getThemeColors() resolves current theme. CONFIG.colors is the default (dark).
 */

// ─── Theme Palettes ───
export const THEMES = {
  dark: {
    bg: '#0E0E0E',
    bgCard: '#161616',
    bgElevated: '#1E1E1E',
    bgHover: '#282828',
    border: '#2A2A2A',
    borderLight: '#3A3A3A',
    text: '#F0EDE6',
    textMuted: '#9A9589',
    textDim: '#6B6560',
    cardShadow: '0 2px 12px rgba(0, 0, 0, 0.25)',
    elevatedShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
  },
  light: {
    bg: '#FDFBD4',
    bgCard: '#FFFFFF',
    bgElevated: '#FFF8E7',
    bgHover: '#F5F0E0',
    border: '#E5E7EB',
    borderLight: '#D1D5DB',
    text: '#0E0E0E',
    textMuted: '#6B7280',
    textDim: '#9CA3AF',
    cardShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    elevatedShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
  },
} as const;

export type ThemeMode = keyof typeof THEMES;

export const CONFIG = {
  app: {
    name: 'Media Pulse',
    tagline: 'Newspaper Composer System',
    version: '1.0.0',
  },

  api: {
    baseUrl: '/api',
    timeout: 30_000,
  },

  // Default colors (dark theme) — shared accent colors
  colors: {
    primary: '#C1121F',
    primaryHover: '#A10E1A',
    primaryGlow: 'rgba(193, 18, 31, 0.15)',

    accent: '#D4A017',
    accentHover: '#B8890F',
    accentGlow: 'rgba(212, 160, 23, 0.15)',

    // Theme-aware colors (dark defaults)
    dark: '#0E0E0E',
    darkCard: '#161616',
    darkElevated: '#1E1E1E',
    darkHover: '#282828',

    light: '#FDFBD4',
    lightAlt: '#FFFFE3',
    cream: '#FFF8E7',

    border: '#2A2A2A',
    borderLight: '#3A3A3A',

    text: '#F0EDE6',
    textMuted: '#9A9589',
    textDim: '#6B6560',

    success: '#34D399',
    warning: '#FBBF24',
    danger: '#EF4444',
    info: '#F59E0B',
  },

  typography: {
    headlineFont: "'Playfair Display', 'Georgia', serif",
    bodyFont: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    monoFont: "'JetBrains Mono', 'Fira Code', monospace",

    scale: {
      heroHeadline: '3rem',
      sectionTitle: '1.75rem',
      cardHeadline: '1.25rem',
      body: '1rem',
      small: '0.875rem',
      meta: '0.75rem',
    },
  },

  radius: {
    sm: '6px',
    md: '14px',
    lg: '20px',
    xl: '24px',
    pill: '999px',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  animation: {
    fast: '150ms ease',
    normal: '300ms ease-in-out',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  shadows: {
    card: '0 2px 12px rgba(0, 0, 0, 0.25)',
    elevated: '0 8px 32px rgba(0, 0, 0, 0.35)',
    glow: '0 0 20px rgba(193, 18, 31, 0.2)',
    goldGlow: '0 0 20px rgba(212, 160, 23, 0.2)',
  },

  priorities: {
    HERO: { label: 'Hero (Full Width)', columns: 6, color: '#EF4444' },
    MAJOR: { label: 'Major (3 Columns)', columns: 3, color: '#F59E0B' },
    STANDARD: { label: 'Standard (2 Columns)', columns: 2, color: '#D4A017' },
    MINOR: { label: 'Minor (1 Column)', columns: 1, color: '#9A9589' },
  },

  pageSizes: {
    TABLOID: { label: 'Tabloid (11×17")', width: '11in', height: '17in' },
    BROADSHEET: { label: 'Broadsheet (15×22")', width: '15in', height: '22.5in' },
    A4: { label: 'A4 (210×297mm)', width: '210mm', height: '297mm' },
    LETTER: { label: 'Letter (8.5×11")', width: '8.5in', height: '11in' },
  },

  stylePresets: {
    DEFAULT: 'Default',
    CLASSIC: 'Classic',
    MODERN: 'Modern',
  },

  contentFormats: {
    PLAINTEXT: 'Plain Text',
    MARKDOWN: 'Markdown',
    JSON: 'JSON',
    YAML: 'YAML',
  },

  editionStatuses: {
    DRAFT: { label: 'Draft', color: '#9A9589' },
    GENERATING: { label: 'Generating', color: '#FBBF24' },
    COMPLETED: { label: 'Completed', color: '#34D399' },
    FAILED: { label: 'Failed', color: '#EF4444' },
  },

  blogStatuses: {
    DRAFT: { label: 'Draft', color: '#9A9589' },
    PUBLISHED: { label: 'Published', color: '#34D399' },
    ARCHIVED: { label: 'Archived', color: '#6B6560' },
  },

  roles: {
    READER: { label: 'Reader', color: '#9A9589' },
    JOURNALIST: { label: 'Journalist', color: '#D4A017' },
    EDITOR: { label: 'Editor', color: '#F59E0B' },
    ADMIN: { label: 'Admin', color: '#C1121F' },
    SUPERADMIN: { label: 'Super Admin', color: '#EF4444' },
  },

  navCategories: [
    'Politics', 'Technology', 'Sports', 'Business',
    'Health', 'Culture', 'Science', 'World',
  ],
} as const;

export type Priority = keyof typeof CONFIG.priorities;
export type PageSize = keyof typeof CONFIG.pageSizes;
export type ContentFormat = keyof typeof CONFIG.contentFormats;
export type EditionStatus = keyof typeof CONFIG.editionStatuses;
