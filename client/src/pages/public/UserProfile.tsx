/**
 * UserProfile — Public user profile with bio, stats, follow button, and blog history.
 */

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { profileApi, blogApi, type BlogPost } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { CONFIG } from '../../config';
import toast from 'react-hot-toast';

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => profileApi.get(username || ''),
    enabled: !!username,
  });

  const followMutation = useMutation({
    mutationFn: () => profile?.is_following
      ? profileApi.unfollow(username || '')
      : profileApi.follow(username || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      toast.success(profile?.is_following ? 'Unfollowed' : 'Following');
    },
    onError: () => toast.error('Action failed'),
  });

  if (isLoading) {
    return <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center' }}><div className="spinner" /></div>;
  }

  if (!profile) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', textAlign: 'center' }}>
        <h1 style={{ fontFamily: CONFIG.typography.headlineFont, color: 'var(--color-text)' }}>User not found</h1>
      </div>
    );
  }

  const isOwnProfile = currentUser?.username === username;
  const canFollow = isAuthenticated && !isOwnProfile && currentUser?.role !== 'GUEST';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      {/* Profile Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginBottom: 32,
      }}>
        <div style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${CONFIG.colors.primary}30, ${CONFIG.colors.accent}30)`,
          border: `3px solid ${CONFIG.colors.accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: CONFIG.typography.headlineFont,
            fontSize: '1.8rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 4,
          }}>
            {profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile.username}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>@{profile.username}</span>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '2px 10px',
              borderRadius: CONFIG.radius.pill,
              background: CONFIG.colors.accentGlow,
              color: CONFIG.colors.accent,
            }}>
              {profile.role}
            </span>
          </div>
          {profile.bio && (
            <p style={{ fontSize: '0.92rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          )}
        </div>

        {canFollow && (
          <button
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            style={{
              padding: '10px 28px',
              borderRadius: CONFIG.radius.pill,
              background: profile.is_following ? 'transparent' : CONFIG.colors.primary,
              color: profile.is_following ? 'var(--color-text)' : '#fff',
              border: profile.is_following ? `1px solid var(--color-border)` : 'none',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.88rem',
              transition: `all ${CONFIG.animation.fast}`,
              flexShrink: 0,
            }}
          >
            {profile.is_following ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          { label: 'Followers', value: profile.follower_count },
          { label: 'Following', value: profile.following_count },
          { label: 'Blog Posts', value: profile.blog_count },
          { label: 'Articles', value: profile.article_count },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              padding: 16,
              borderRadius: CONFIG.radius.md,
              background: 'var(--color-bg-card)',
              border: `1px solid var(--color-border)`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)' }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Member since */}
      <p style={{
        fontSize: '0.82rem',
        color: 'var(--color-text-dim)',
        textAlign: 'center',
      }}>
        Member since {new Date(profile.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
      </p>
    </div>
  );
}
