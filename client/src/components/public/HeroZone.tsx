/**
 * HeroZone — Large hero carousel + side stories for homepage.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../../config';
import type { Article } from '../../api/client';

interface HeroZoneProps {
  articles: Article[];
}

export default function HeroZone({ articles }: HeroZoneProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const mainArticle = articles[activeIndex] || articles[0];
  const sideArticles = articles.filter((_, i) => i !== activeIndex).slice(0, 2);

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % Math.min(articles.length, 5));
    }, 6000);
    return () => clearInterval(timer);
  }, [articles.length]);

  if (!articles.length) return null;

  return (
    <section style={{
      maxWidth: 1280,
      margin: '0 auto',
      padding: '24px 24px 0',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 20,
      minHeight: 380,
    }}>
      {/* Main Hero */}
      {mainArticle && (
        <Link
          to={`/article/${mainArticle.id}`}
          style={{
            textDecoration: 'none',
            borderRadius: CONFIG.radius.lg,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
            background: mainArticle.image
              ? `linear-gradient(transparent 30%, rgba(0,0,0,0.85)), url(${mainArticle.image}) center/cover`
              : `linear-gradient(135deg, ${CONFIG.colors.primary}20, ${CONFIG.colors.accent}20)`,
            backgroundColor: 'var(--color-bg-elevated)',
            minHeight: 380,
            transition: `all ${CONFIG.animation.normal}`,
          }}
        >
          <div style={{ padding: 32, color: '#fff', position: 'relative', zIndex: 1 }}>
            {mainArticle.category_name && (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                background: CONFIG.colors.primary,
                padding: '4px 12px',
                borderRadius: CONFIG.radius.pill,
                marginBottom: 12,
                display: 'inline-block',
              }}>
                {mainArticle.category_name}
              </span>
            )}
            <h2 style={{
              fontFamily: CONFIG.typography.headlineFont,
              fontSize: '1.8rem',
              fontWeight: 700,
              lineHeight: 1.25,
              marginBottom: 8,
              color: '#fff',
            }}>
              {mainArticle.headline}
            </h2>
            <p style={{
              fontSize: '0.9rem',
              opacity: 0.85,
              lineHeight: 1.5,
              maxWidth: '80%',
            }}>
              {mainArticle.subheadline}
            </p>
            <div style={{ marginTop: 12, fontSize: '0.78rem', opacity: 0.7 }}>
              {mainArticle.author_name || mainArticle.byline} &middot; {new Date(mainArticle.created_at).toLocaleDateString()}
            </div>
          </div>

          {/* Dots */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 24,
            display: 'flex',
            gap: 6,
          }}>
            {articles.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.preventDefault(); setActiveIndex(i); }}
                style={{
                  width: i === activeIndex ? 24 : 8,
                  height: 8,
                  borderRadius: CONFIG.radius.pill,
                  background: i === activeIndex ? CONFIG.colors.accent : 'rgba(255,255,255,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: `all ${CONFIG.animation.fast}`,
                }}
              />
            ))}
          </div>
        </Link>
      )}

      {/* Side Stories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sideArticles.map(article => (
          <Link
            key={article.id}
            to={`/article/${article.id}`}
            style={{
              textDecoration: 'none',
              flex: 1,
              borderRadius: CONFIG.radius.lg,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              background: article.image
                ? `linear-gradient(transparent 20%, rgba(0,0,0,0.8)), url(${article.image}) center/cover`
                : 'var(--color-bg-elevated)',
              transition: `all ${CONFIG.animation.normal}`,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{ padding: 20, color: article.image ? '#fff' : 'var(--color-text)' }}>
              {article.category_name && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: CONFIG.colors.accent,
                  marginBottom: 6,
                  display: 'inline-block',
                }}>
                  {article.category_name}
                </span>
              )}
              <h3 style={{
                fontFamily: CONFIG.typography.headlineFont,
                fontSize: '1.05rem',
                fontWeight: 700,
                lineHeight: 1.3,
              }}>
                {article.headline}
              </h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
