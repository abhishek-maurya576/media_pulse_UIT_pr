/**
 * BreakingTicker — Auto-scrolling breaking news strip.
 */

import React from 'react';
import { CONFIG } from '../../config';

interface BreakingTickerProps {
  headlines: string[];
}

export default function BreakingTicker({ headlines }: BreakingTickerProps) {
  if (!headlines.length) return null;

  const tickerText = headlines.join('  \u2022  ');

  return (
    <div style={{
      background: CONFIG.colors.primary,
      color: '#fff',
      padding: '8px 0',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      position: 'relative',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        paddingLeft: 24,
      }}>
        <span style={{
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.2)',
          padding: '2px 10px',
          borderRadius: CONFIG.radius.pill,
        }}>
          BREAKING
        </span>
        <div style={{
          overflow: 'hidden',
          flex: 1,
        }}>
          <div
            style={{
              display: 'inline-block',
              animation: 'ticker-scroll 30s linear infinite',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}
          >
            {tickerText}  &nbsp;&nbsp;&nbsp;  {tickerText}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
