import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CONFIG } from '../config';
import { templateApi, type Template } from '../api/client';
import { Check, Palette, X, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

/* ─── Preset Visual Config ─── */
const PRESET_VISUALS: Record<string, {
  accentColor: string;
  bgTint: string;
  textColor: string;
  mutedColor: string;
  borderThick: string;
  borderThin: string;
  ruleColor: string;
  colRuleColor: string;
  bodySize: string;
  leading: string;
  dropCapColor: string;
  catBorder: string;
  catBg: string;
  mastheadBg: string;
  highlightBg: string;
  label: string;
}> = {
  DEFAULT: {
    accentColor: '#C1121F', bgTint: '#FFFFFF', textColor: '#111', mutedColor: '#666',
    borderThick: '3px', borderThin: '0.5px', ruleColor: '#000', colRuleColor: '#bbb',
    bodySize: '11px', leading: '1.35', dropCapColor: '#000',
    catBorder: '1.5px solid #C1121F', catBg: 'transparent',
    mastheadBg: '#fff', highlightBg: '#f5f3ee',
    label: 'Standard',
  },
  CLASSIC: {
    accentColor: '#8B0000', bgTint: '#FFF8E8', textColor: '#1A1A1A', mutedColor: '#555',
    borderThick: '5px', borderThin: '1px', ruleColor: '#222', colRuleColor: '#8B000040',
    bodySize: '12px', leading: '1.42', dropCapColor: '#8B0000',
    catBorder: '2.5px double #8B0000', catBg: '#FFF4E0',
    mastheadBg: '#FFF4E0', highlightBg: '#FFF4E0',
    label: 'Traditional',
  },
  MODERN: {
    accentColor: '#E63946', bgTint: '#F8F9FA', textColor: '#222', mutedColor: '#888',
    borderThick: '2px', borderThin: '0.3px', ruleColor: '#444', colRuleColor: '#E8E8E8',
    bodySize: '11px', leading: '1.45', dropCapColor: '#E63946',
    catBorder: 'none', catBg: '#F0F0F0',
    mastheadBg: '#F8F9FA', highlightBg: '#F0F4F8',
    label: 'Contemporary',
  },
};

/* ─── Fake newspaper content for preview ─── */
const PREVIEW_HEADLINE = 'प्रयागराज में विकास की नई लहर';
const PREVIEW_SUB = 'शहर में बुनियादी ढाँचे का विस्तार';
const PREVIEW_BODY = 'प्रयागराज नगर निगम ने शहर के विभिन्न क्षेत्रों में नई सड़कों, पुलों एवं पार्कों के निर्माण की योजना का ऐलान किया है। मेयर ने कहा कि इस वर्ष के बजट में शहरी विकास के लिए विशेष प्रावधान किया गया है।';
const PREVIEW_BODY2 = 'अधिकारियों ने बताया कि परियोजनाओं का कार्य अगले माह से प्रारम्भ होगा। जनता से अपील की गई है कि वे सहयोग करें।';
const PREVIEW_MINOR = 'स्वास्थ्य विभाग ने ग्रामीण क्षेत्रों में मुफ्त चिकित्सा शिविर लगाने की घोषणा की है। यह शिविर अगले सप्ताह से शुरू होंगे।';
const PREVIEW_CAT = 'राजनीति';
const PREVIEW_CAT2 = 'स्वास्थ्य';

export default function TemplateManager() {
  const queryClient = useQueryClient();
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  const { data: templatesResp, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templateApi.list,
  });

  const templates = templatesResp?.results || [];

  const activateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const deactivatePromises = templates
        .filter(t => t.id !== templateId && t.is_active)
        .map(t => templateApi.update(t.id, { is_active: false }));
      await Promise.all(deactivatePromises);
      return templateApi.update(templateId, { is_active: true });
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      const preset = updatedTemplate.layout_definition?.style_preset || 'DEFAULT';
      toast.success(`"${updatedTemplate.name}" activated (${preset})`);
    },
    onError: () => toast.error('Failed to activate template'),
  });

  const getPresetKey = (tmpl: Template): string =>
    tmpl.layout_definition?.style_preset || 'DEFAULT';

  if (isLoading) {
    return (
      <div className="page-container" style={{ maxWidth: 900 }}>
        <div className="page-header">
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 900 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-subtitle">Select a layout style for your newspaper PDF</p>
        </div>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      {/* Info banner */}
      <div style={{
        background: `${CONFIG.colors.accent}10`,
        border: `1px solid ${CONFIG.colors.accent}30`,
        borderRadius: CONFIG.radius.md,
        padding: '12px 16px',
        marginBottom: 24,
        fontSize: '0.85rem',
        color: 'var(--color-text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <Palette size={16} color={CONFIG.colors.accent} />
        Click any template to preview. Use the "Activate" button to apply it to all new editions.
      </div>

      {/* Template Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {templates.map((tmpl) => {
          const presetKey = getPresetKey(tmpl);
          const visuals = PRESET_VISUALS[presetKey] || PRESET_VISUALS.DEFAULT;
          const isActive = tmpl.is_active;

          return (
            <div
              key={tmpl.id}
              className={isActive ? 'glass-card-accent' : 'glass-card'}
              style={{
                padding: 20,
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onClick={() => setPreviewTemplate(tmpl)}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              {/* Active badge */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  padding: '2px 8px',
                  background: `${CONFIG.colors.accent}20`,
                  color: CONFIG.colors.accent,
                  borderRadius: CONFIG.radius.pill,
                  fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Check size={10} /> Active
                </div>
              )}

              {/* Mini newspaper preview swatch */}
              <MiniNewspaperPreview visuals={visuals} />

              {/* Template info */}
              <h3 style={{
                fontFamily: CONFIG.typography.headlineFont,
                fontSize: '1rem', fontWeight: 600, marginBottom: 4,
              }}>
                {tmpl.name}
              </h3>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '1px 8px',
                background: `${visuals.accentColor}15`,
                borderRadius: CONFIG.radius.pill,
                fontSize: '0.65rem', fontWeight: 600,
                color: visuals.accentColor, marginBottom: 8,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: visuals.accentColor }} />
                {presetKey}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                {tmpl.description}
              </p>

              {/* Preview hint */}
              <div style={{
                marginTop: 10, display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.72rem', color: 'var(--color-text-dim)',
              }}>
                <Eye size={12} /> Click to preview
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Preview Modal ─── */}
      <AnimatePresence>
        {previewTemplate && (
          <PreviewModal
            template={previewTemplate}
            visuals={PRESET_VISUALS[getPresetKey(previewTemplate)] || PRESET_VISUALS.DEFAULT}
            presetKey={getPresetKey(previewTemplate)}
            isActive={previewTemplate.is_active}
            isPending={activateTemplateMutation.isPending}
            onClose={() => setPreviewTemplate(null)}
            onActivate={() => {
              activateTemplateMutation.mutate(previewTemplate.id);
              setPreviewTemplate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════ */
/* ─── Mini Newspaper Preview (Card Swatch) ─── */
/* ═══════════════════════════════════════════════════════ */
function MiniNewspaperPreview({ visuals }: { visuals: typeof PRESET_VISUALS[string] }) {
  return (
    <div style={{
      width: '100%', height: 130,
      background: visuals.bgTint,
      borderRadius: CONFIG.radius.md,
      marginBottom: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      <div style={{
        width: '75%', height: '85%',
        background: '#fff', borderRadius: 4, padding: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{ borderTop: `${visuals.borderThick} solid ${visuals.ruleColor}`, marginBottom: 3 }} />
        <div style={{ width: '55%', height: 5, background: '#333', borderRadius: 1, margin: '0 auto 3px' }} />
        <div style={{ borderBottom: `${visuals.borderThin} solid ${visuals.ruleColor}`, marginBottom: 4 }} />
        <div style={{ display: 'flex', gap: 3, height: '60%' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column', gap: 2,
              borderLeft: i > 0 ? `${visuals.borderThin} solid ${visuals.colRuleColor}` : 'none',
              paddingLeft: i > 0 ? 3 : 0,
            }}>
              {[0, 1, 2, 3, 4].map(j => (
                <div key={j} style={{
                  width: j === 0 ? '75%' : '100%',
                  height: j === 0 ? 3 : 1.5,
                  background: j === 0 ? visuals.accentColor : '#ddd',
                  borderRadius: 1,
                }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════ */
/* ─── Full Newspaper Preview Modal ─── */
/* ═══════════════════════════════════════════════════════ */
function PreviewModal({
  template, visuals, presetKey, isActive, isPending, onClose, onActivate,
}: {
  template: Template;
  visuals: typeof PRESET_VISUALS[string];
  presetKey: string;
  isActive: boolean;
  isPending: boolean;
  onClose: () => void;
  onActivate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 720, maxHeight: '92vh',
          background: 'var(--color-bg-card)',
          borderRadius: CONFIG.radius.lg,
          boxShadow: CONFIG.shadows.elevated,
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{
              fontFamily: CONFIG.typography.headlineFont,
              fontSize: '1.15rem', fontWeight: 700,
            }}>
              {template.name}
            </h2>
            <span style={{
              padding: '2px 10px',
              background: `${visuals.accentColor}15`,
              color: visuals.accentColor,
              borderRadius: CONFIG.radius.pill,
              fontSize: '0.68rem', fontWeight: 600,
            }}>
              {presetKey}
            </span>
            {isActive && (
              <span style={{
                padding: '2px 8px',
                background: `${CONFIG.colors.success}20`,
                color: CONFIG.colors.success,
                borderRadius: CONFIG.radius.pill,
                fontSize: '0.65rem', fontWeight: 600,
              }}>
                ACTIVE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isActive && (
              <button
                className="btn btn-accent"
                style={{ fontSize: '0.78rem', padding: '6px 16px' }}
                disabled={isPending}
                onClick={onActivate}
              >
                <Check size={14} /> Activate
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'var(--color-bg-hover)', border: 'none', borderRadius: CONFIG.radius.sm,
                padding: 6, cursor: 'pointer', display: 'flex',
              }}
            >
              <X size={18} color="var(--color-text-muted)" />
            </button>
          </div>
        </div>

        {/* Newspaper Preview */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 20,
          background: 'var(--color-bg-elevated)',
        }}>
          <div style={{
            width: '100%', maxWidth: 640, margin: '0 auto',
            background: visuals.bgTint,
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            borderRadius: 4,
            padding: '20px 24px',
            fontFamily: "'Ubuntu', 'Amita', serif",
            color: visuals.textColor,
            fontSize: visuals.bodySize,
            lineHeight: visuals.leading,
          }}>
            {/* ─── Masthead ─── */}
            <div style={{ borderTop: `${visuals.borderThick} solid ${visuals.ruleColor}` }} />

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              padding: '4px 0 2px',
              fontSize: '8px', color: visuals.mutedColor,
            }}>
              <span>प्रयागराज से प्रकाशित</span>
              <span>जनसहयोग पर आधारित विश्व का एकमात्र</span>
            </div>

            <div style={{
              fontFamily: "'Ranga', 'Amita', serif",
              fontSize: '32px', fontWeight: 700,
              textAlign: 'center',
              padding: '4px 0',
              letterSpacing: '1px',
            }}>
              बी.आर.टाइम्स
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '8px', padding: '2px 0 4px',
              borderBottom: `${visuals.borderThin} solid ${visuals.ruleColor}`,
            }}>
              <span style={{ color: visuals.accentColor }}>प्रेरणा स्रोत स्व0 सूर्यनारायण त्रिपाठी</span>
              <span style={{ color: visuals.accentColor, fontWeight: 700 }}>हिन्दी साप्ताहिक</span>
              <span>प्रधान सम्पादक: बलराम दीक्षित</span>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '7px', color: visuals.mutedColor,
              padding: '3px 0 6px',
            }}>
              <span>शुक्रवार, 18 अप्रैल 2026</span>
              <span>(पृष्ठ-8)</span>
              <span>मूल्य मात्र 2 रुपए</span>
            </div>

            {/* ─── Category Label ─── */}
            <div style={{
              fontFamily: "'Amita', serif",
              fontSize: '13px', fontWeight: 700,
              color: visuals.accentColor,
              textAlign: 'center',
              padding: '3px 0',
              marginBottom: 6,
              borderBottom: visuals.catBorder,
              background: presetKey === 'MODERN' ? '#F8F8F8' : 'transparent',
            }}>
              ❖ {PREVIEW_CAT} ❖
            </div>

            {/* ─── Hero Article ─── */}
            <div style={{ marginBottom: 10 }}>
              <div style={{
                fontFamily: "'Amita', serif",
                fontSize: '20px', fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: 3,
              }}>
                {PREVIEW_HEADLINE}
              </div>
              <div style={{
                fontSize: '11px', color: visuals.mutedColor,
                fontStyle: 'italic', marginBottom: 4,
              }}>
                {PREVIEW_SUB}
              </div>
              <div style={{
                fontSize: '7px', color: visuals.mutedColor,
                marginBottom: 6,
              }}>
                संवाददाता | 18 अप्रैल 2026
              </div>
              <div style={{
                borderBottom: `${visuals.borderThin} solid ${visuals.colRuleColor}`,
                marginBottom: 8,
              }} />
            </div>

            {/* ─── Three Column Content ─── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 0,
            }}>
              {/* Column 1 */}
              <div style={{ paddingRight: 10 }}>
                <div style={{
                  fontSize: '7px', fontWeight: 700,
                  color: visuals.accentColor, marginBottom: 2,
                }}>
                  {PREVIEW_CAT}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: 3, lineHeight: 1.15 }}>
                  नई योजनाओं का शुभारम्भ
                </div>
                <p style={{ textAlign: 'justify', fontSize: visuals.bodySize, lineHeight: visuals.leading }}>
                  <span style={{
                    fontWeight: 700, fontSize: '2.2em', float: 'left',
                    lineHeight: 0.75, marginRight: 3, marginTop: 1,
                    color: visuals.dropCapColor,
                  }}>प्र</span>
                  {PREVIEW_BODY}
                </p>
              </div>

              {/* Column 2 */}
              <div style={{
                paddingLeft: 10, paddingRight: 10,
                borderLeft: `${visuals.borderThin} solid ${visuals.colRuleColor}`,
                borderRight: `${visuals.borderThin} solid ${visuals.colRuleColor}`,
              }}>
                <div style={{
                  background: '#f5f3ee',
                  padding: '5px 7px',
                  borderLeft: `2px solid ${visuals.accentColor}`,
                  fontSize: '8px', lineHeight: 1.3,
                  marginBottom: 6,
                }}>
                  <div style={{
                    fontFamily: "'Amita', serif", fontSize: '7px',
                    marginBottom: 2, color: visuals.accentColor, fontWeight: 700,
                  }}>
                    मुख्य बिन्दु
                  </div>
                  <ul style={{ paddingLeft: 12, margin: 0, color: '#222' }}>
                    <li>नई सड़कों का निर्माण</li>
                    <li>पुलों का जीर्णोद्धार</li>
                    <li>पार्क विकास योजना</li>
                  </ul>
                </div>
                <p style={{ textAlign: 'justify', fontSize: visuals.bodySize, lineHeight: visuals.leading }}>
                  {PREVIEW_BODY2}
                </p>
              </div>

              {/* Column 3 */}
              <div style={{ paddingLeft: 10 }}>
                <div style={{
                  fontSize: '7px', fontWeight: 700,
                  color: visuals.accentColor, marginBottom: 2,
                }}>
                  {PREVIEW_CAT2}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: 3, lineHeight: 1.15 }}>
                  मुफ्त चिकित्सा शिविर
                </div>
                <p style={{ textAlign: 'justify', fontSize: visuals.bodySize, lineHeight: visuals.leading }}>
                  {PREVIEW_MINOR}
                </p>
              </div>
            </div>

            {/* ─── Footer ─── */}
            <div style={{
              borderTop: `${visuals.borderThin} solid ${visuals.ruleColor}`,
              marginTop: 14, paddingTop: 4,
              fontSize: '7px', color: visuals.mutedColor,
              textAlign: 'center',
            }}>
              बी.आर.टाइम्स — प्रयागराज — पृष्ठ 1
            </div>
          </div>

          {/* ─── Style Details Table ─── */}
          <div style={{
            maxWidth: 640, margin: '20px auto 0',
            background: 'var(--color-bg-card)',
            borderRadius: CONFIG.radius.md,
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--color-border)',
              fontFamily: CONFIG.typography.headlineFont,
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              Style Properties
            </div>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Accent Color', visuals.accentColor, <div style={{ width: 14, height: 14, borderRadius: 3, background: visuals.accentColor }} />],
                  ['Background', visuals.bgTint, <div style={{ width: 14, height: 14, borderRadius: 3, background: visuals.bgTint, border: '1px solid #ddd' }} />],
                  ['Top Border', visuals.borderThick, null],
                  ['Column Rules', `${visuals.borderThin} / ${visuals.colRuleColor}`, null],
                  ['Body Text', `${visuals.bodySize} / ${visuals.leading}`, null],
                  ['Drop Cap', visuals.dropCapColor, <div style={{ width: 14, height: 14, borderRadius: 3, background: visuals.dropCapColor }} />],
                ].map(([label, value, swatch], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '6px 16px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</td>
                    <td style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {swatch}
                      <code style={{
                        background: 'var(--color-bg-hover)', padding: '1px 6px',
                        borderRadius: 4, fontSize: '0.72rem',
                      }}>
                        {value as string}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
