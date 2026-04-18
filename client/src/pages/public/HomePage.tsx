/**
 * HomePage — Public landing page combining all sections.
 * Breaking ticker → Hero → Category chips → Trending → Latest feed → Journalists
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi, type Article } from '../../api/client';
import BreakingTicker from '../../components/public/BreakingTicker';
import HeroZone from '../../components/public/HeroZone';
import CategoryChips from '../../components/public/CategoryChips';
import TrendingSlider from '../../components/public/TrendingSlider';
import ArticleCard from '../../components/public/ArticleCard';
import JournalistHighlights from '../../components/public/JournalistHighlights';
import { CONFIG } from '../../config';
import logoIcon from '../../assets/logos/media_pulse_icon.png';

export default function HomePage() {
  const { data: featured = [] } = useQuery({ queryKey: ['public-featured'], queryFn: publicApi.featured });
  const { data: trending = [] } = useQuery({ queryKey: ['public-trending'], queryFn: publicApi.trending });
  const { data: latestData } = useQuery({ queryKey: ['public-latest'], queryFn: () => publicApi.latest(1) });
  const { data: categories = [] } = useQuery({ queryKey: ['public-categories'], queryFn: publicApi.categories });
  const { data: journalists = [] } = useQuery({ queryKey: ['public-journalists'], queryFn: publicApi.journalists });

  const latestArticles = latestData?.results ?? [];
  const breakingHeadlines = featured.slice(0, 3).map((a: Article) => a.headline);

  return (
    <div>
      {/* Breaking Ticker */}
      <BreakingTicker headlines={breakingHeadlines} />

      {/* Hero Zone */}
      <HeroZone articles={featured} />

      {/* Category Chips */}
      <CategoryChips categories={categories} />

      {/* Trending Slider */}
      <TrendingSlider articles={trending} />

      {/* Latest News Feed */}
      <section style={{
        maxWidth: 1280,
        margin: '0 auto',
        padding: '0 24px 32px',
      }}>
        <h2 style={{
          fontFamily: CONFIG.typography.headlineFont,
          fontSize: '1.4rem',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            width: 4,
            height: 24,
            borderRadius: 2,
            background: CONFIG.colors.primary,
            display: 'inline-block',
          }} />
          Latest News
        </h2>
        {latestArticles.length === 0 ? (
          <div style={{
            padding: 48,
            textAlign: 'center',
            borderRadius: CONFIG.radius.lg,
            background: 'var(--color-bg-card)',
            border: `1px solid var(--color-border)`,
          }}>
            <img src={logoIcon} alt="" style={{ width: 48, height: 48, objectFit: 'contain', opacity: 0.4, marginBottom: 12 }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
              No published articles yet. Check back soon!
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}>
            {latestArticles.map((article: Article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </section>

      {/* Journalist Highlights */}
      <JournalistHighlights journalists={journalists} />
    </div>
  );
}
