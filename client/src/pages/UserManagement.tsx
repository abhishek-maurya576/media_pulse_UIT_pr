import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CONFIG } from '../config';
import { adminApi, AdminUser, AuditLogEntry, AdminUserDetail } from '../api/client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  Search, UserPlus, Shield, Ban, CheckCircle, Trash2, Key,
  LogOut, X, ChevronLeft, ChevronRight, MoreVertical,
  Users, AlertTriangle, RefreshCw, Eye, Pause, Play,
} from 'lucide-react';
import './UserManagement.css';

const ROLES = Object.entries(CONFIG.roles);
const STATUSES = Object.entries(CONFIG.userStatuses);

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function RoleBadge({ role }: { role: string }) {
  const r = CONFIG.roles[role as keyof typeof CONFIG.roles];
  const color = r?.color || '#9A9589';
  const label = r?.label || role;
  return (
    <span className="um-role-badge" style={{ background: `${color}18`, color }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = CONFIG.userStatuses[status as keyof typeof CONFIG.userStatuses];
  const color = s?.color || '#9A9589';
  const label = s?.label || status;
  return (
    <span className="um-status-badge" style={{ background: `${color}18`, color }}>
      <span className="status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

function UserDrawer({ userId, onClose, onRefresh }: {
  userId: string; onClose: () => void; onRefresh: () => void;
}) {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: () => adminApi.getUser(userId),
  });
  const { data: logs } = useQuery({
    queryKey: ['admin-audit', userId],
    queryFn: () => adminApi.auditLogs({ user_id: userId }),
  });

  const [showResetPw, setShowResetPw] = useState(false);
  const [newPw, setNewPw] = useState('');

  const roleMut = useMutation({
    mutationFn: ({ role }: { role: string }) => adminApi.changeRole(userId, role),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['admin-user', userId] }); onRefresh(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const statusMut = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) => adminApi.changeStatus(userId, status, reason),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['admin-user', userId] }); onRefresh(); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const resetPwMut = useMutation({
    mutationFn: (pw: string) => adminApi.resetPassword(userId, pw),
    onSuccess: () => { toast.success('Password reset'); setShowResetPw(false); setNewPw(''); },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const logoutMut = useMutation({
    mutationFn: () => adminApi.forceLogout(userId),
    onSuccess: () => toast.success('User logged out'),
    onError: (e: any) => toast.error(e.response?.data?.error || 'Failed'),
  });

  if (isLoading || !user) return (
    <>
      <div className="um-drawer-overlay" onClick={onClose} />
      <div className="um-drawer"><div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" /></div></div>
    </>
  );

  const isSelf = me?.id === userId;
  const canManage = !isSelf && (me?.role === 'SUPERADMIN' || (me?.role === 'ADMIN' && !['ADMIN', 'SUPERADMIN'].includes(user.role)));
  const canAssignAdminRoles = me?.role === 'SUPERADMIN';
  const availableRoles = canAssignAdminRoles
    ? ROLES
    : ROLES.filter(([k]) => !['ADMIN', 'SUPERADMIN'].includes(k));

  return (
    <>
      <div className="um-drawer-overlay" onClick={onClose} />
      <div className="um-drawer">
        <div className="um-drawer-header">
          <h2>User Details</h2>
          <button className="um-action-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="um-drawer-body">
          {/* Profile card */}
          <div className="um-profile-card">
            <div className="um-profile-avatar">
              {user.avatar ? <img src={user.avatar} alt="" /> : (user.first_name?.[0] || user.username[0]).toUpperCase()}
            </div>
            <div className="um-profile-info">
              <div className="um-profile-name">{user.first_name} {user.last_name}</div>
              <div className="um-profile-email">@{user.username} · {user.email}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <RoleBadge role={user.role} />
                <StatusBadge status={user.status} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="um-drawer-section">
            <div className="um-drawer-section-title">Activity</div>
            <div className="um-detail-row"><span className="label">Articles</span><span className="value">{user.article_count}</span></div>
            <div className="um-detail-row"><span className="label">Blog Posts</span><span className="value">{user.blog_count}</span></div>
            <div className="um-detail-row"><span className="label">Followers</span><span className="value">{user.follower_count}</span></div>
            <div className="um-detail-row"><span className="label">Following</span><span className="value">{user.following_count}</span></div>
            <div className="um-detail-row"><span className="label">Joined</span><span className="value">{new Date(user.date_joined).toLocaleDateString()}</span></div>
            <div className="um-detail-row"><span className="label">Last Login</span><span className="value">{timeAgo(user.last_login)}</span></div>
            {user.created_by_name && <div className="um-detail-row"><span className="label">Created By</span><span className="value">{user.created_by_name}</span></div>}
          </div>

          {/* Role change */}
          {canManage && (
            <div className="um-drawer-section">
              <div className="um-drawer-section-title">Role &amp; Permissions</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="um-filter-select"
                  value={user.role}
                  onChange={e => roleMut.mutate({ role: e.target.value })}
                  style={{ flex: 1 }}
                >
                  {availableRoles.map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                {roleMut.isPending && <div className="spinner" style={{ width: 16, height: 16 }} />}
              </div>
            </div>
          )}

          {/* Admin actions */}
          {canManage && (
            <div className="um-drawer-section">
              <div className="um-drawer-section-title">Admin Actions</div>
              <div className="um-drawer-actions">
                {user.status === 'active' ? (
                  <>
                    <button className="um-drawer-action-btn" onClick={() => statusMut.mutate({ status: 'suspended', reason: 'Admin action' })}>
                      <Pause size={16} /> Suspend User
                    </button>
                    <button className="um-drawer-action-btn danger" onClick={() => { if (confirm('Ban this user permanently?')) statusMut.mutate({ status: 'banned', reason: 'Admin action' }); }}>
                      <Ban size={16} /> Ban User
                    </button>
                  </>
                ) : user.status === 'suspended' || user.status === 'banned' ? (
                  <button className="um-drawer-action-btn success" onClick={() => statusMut.mutate({ status: 'active' })}>
                    <Play size={16} /> Reactivate User
                  </button>
                ) : null}
                <button className="um-drawer-action-btn" onClick={() => setShowResetPw(!showResetPw)}>
                  <Key size={16} /> Reset Password
                </button>
                {showResetPw && (
                  <div style={{ display: 'flex', gap: 8, padding: '0 0 0 26px' }}>
                    <input className="input" placeholder="New password (min 8)" value={newPw} onChange={e => setNewPw(e.target.value)} type="password" style={{ flex: 1, padding: '7px 10px', fontSize: '0.82rem' }} />
                    <button className="btn btn-primary btn-sm" disabled={newPw.length < 8} onClick={() => resetPwMut.mutate(newPw)}>Set</button>
                  </div>
                )}
                <button className="um-drawer-action-btn" onClick={() => logoutMut.mutate()}>
                  <LogOut size={16} /> Force Logout
                </button>
                {user.status !== 'deleted' && (
                  <button className="um-drawer-action-btn danger" onClick={() => { if (confirm('Soft-delete this user? They will not be able to login.')) statusMut.mutate({ status: 'deleted', reason: 'Deleted by admin' }); }}>
                    <Trash2 size={16} /> Delete User (Soft)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Audit timeline */}
          {logs && logs.results.length > 0 && (
            <div className="um-drawer-section">
              <div className="um-drawer-section-title">Recent Activity</div>
              <div className="um-timeline">
                {logs.results.slice(0, 10).map(log => {
                  const actionCfg = CONFIG.auditActions[log.action as keyof typeof CONFIG.auditActions];
                  return (
                    <div key={log.id} className="um-timeline-item">
                      <div className="um-timeline-content">
                        <div className="um-timeline-action">
                          {actionCfg?.label || log.action}
                          {log.metadata?.old_role && log.metadata?.new_role && (
                            <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                              {' '}{log.metadata.old_role} → {log.metadata.new_role}
                            </span>
                          )}
                        </div>
                        <div className="um-timeline-meta">
                          {log.actor_name} · {timeAgo(log.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { user: me } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'READER' });
  const [error, setError] = useState('');

  const canAssignAdmin = me?.role === 'SUPERADMIN';
  const availableRoles = canAssignAdmin ? ROLES : ROLES.filter(([k]) => !['ADMIN', 'SUPERADMIN'].includes(k));

  const mut = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: () => { toast.success('User created'); onCreated(); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      setError(typeof d === 'string' ? d : d?.error || d?.username?.[0] || d?.email?.[0] || 'Creation failed');
    },
  });

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <h2>Create New User</h2>
        {error && <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', color: CONFIG.colors.danger, borderRadius: CONFIG.radius.sm, marginBottom: 16, fontSize: '0.82rem' }}>{error}</div>}
        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">First Name</label>
            <input className="input" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Last Name</label>
            <input className="input" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Username *</label>
          <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Email *</label>
          <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
        </div>
        <div className="form-group">
          <label className="form-label">Role</label>
          <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {availableRoles.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" disabled={!form.username || !form.email || form.password.length < 8 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <UserPlus size={16} />}
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagement() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', debouncedSearch, roleFilter, statusFilter, page],
    queryFn: () => adminApi.listUsers({
      search: debouncedSearch || undefined,
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      page,
    }),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.stats(),
  });

  const users = data?.results || [];
  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  };

  const bulkStatusMut = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      adminApi.bulkStatus(Array.from(selected), status, reason),
    onSuccess: (d: any) => {
      toast.success(`${d.updated} user(s) updated`);
      if (d.errors?.length) d.errors.forEach((e: string) => toast.error(e));
      setSelected(new Set());
      refetch();
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Bulk action failed'),
  });

  const bulkRoleMut = useMutation({
    mutationFn: (role: string) => adminApi.bulkRole(Array.from(selected), role),
    onSuccess: (d: any) => {
      toast.success(`${d.updated} user(s) updated`);
      if (d.errors?.length) d.errors.forEach((e: string) => toast.error(e));
      setSelected(new Set());
      refetch();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Bulk action failed'),
  });

  const handleRefresh = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: ['admin-stats'] });
  }, [refetch, qc]);

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage users, roles, and permissions</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowCreate(true)}>
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="accent-line" style={{ marginBottom: 24 }} />

      {/* Stats */}
      {stats && (
        <div className="um-stats-bar">
          <div className="um-stat-chip">
            <div className="stat-dot" style={{ background: CONFIG.colors.accent }} />
            <div className="stat-info">
              <div className="stat-count">{stats.total}</div>
              <div className="stat-name">Total Users</div>
            </div>
          </div>
          {STATUSES.map(([key, val]) => (
            <div className="um-stat-chip" key={key}>
              <div className="stat-dot" style={{ background: val.color }} />
              <div className="stat-info">
                <div className="stat-count">{stats.by_status[key] || 0}</div>
                <div className="stat-name">{val.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-search">
          <Search size={16} />
          <input placeholder="Search users..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="um-filter-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          {ROLES.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="um-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {STATUSES.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={handleRefresh}><RefreshCw size={14} /></button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="um-bulk-bar">
          <span className="bulk-count">{selected.size} selected</span>
          <div className="bulk-actions">
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatusMut.mutate({ status: 'suspended', reason: 'Bulk suspend' })}>
              <Pause size={13} /> Suspend
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => bulkStatusMut.mutate({ status: 'active' })}>
              <CheckCircle size={13} /> Activate
            </button>
            <select className="um-filter-select" style={{ fontSize: '0.78rem', padding: '5px 28px 5px 8px' }} defaultValue="" onChange={e => { if (e.target.value) bulkRoleMut.mutate(e.target.value); e.target.value = ''; }}>
              <option value="" disabled>Assign Role...</option>
              {(me?.role === 'SUPERADMIN' ? ROLES : ROLES.filter(([k]) => !['ADMIN', 'SUPERADMIN'].includes(k))).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
              <X size={13} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="um-table-wrap animate-fade-in">
        {isLoading ? (
          <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : users.length === 0 ? (
          <div className="empty-state"><Users size={48} /><p>No users found</p></div>
        ) : (
          <>
            <table className="um-table">
              <thead>
                <tr>
                  <th className="th-check"><input type="checkbox" className="um-checkbox" checked={selected.size === users.length && users.length > 0} onChange={toggleAll} /></th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last Active</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={selected.has(u.id) ? 'selected' : ''}>
                    <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="um-checkbox" checked={selected.has(u.id)} onChange={() => toggleSelect(u.id)} />
                    </td>
                    <td onClick={() => setDrawerUserId(u.id)}>
                      <div className="um-user-cell">
                        <div className="um-avatar">
                          {u.avatar ? <img src={u.avatar} alt="" /> : (u.first_name?.[0] || u.username[0]).toUpperCase()}
                        </div>
                        <div className="um-user-info">
                          <div className="um-name">{u.first_name} {u.last_name}</div>
                          <div className="um-username">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td onClick={() => setDrawerUserId(u.id)} className="um-email">{u.email}</td>
                    <td onClick={() => setDrawerUserId(u.id)}><RoleBadge role={u.role} /></td>
                    <td onClick={() => setDrawerUserId(u.id)}><StatusBadge status={u.status} /></td>
                    <td onClick={() => setDrawerUserId(u.id)} className="um-date">{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td onClick={() => setDrawerUserId(u.id)} className="um-date">{timeAgo(u.last_login)}</td>
                    <td>
                      <div className="um-actions">
                        <button className="um-action-btn" title="View Details" onClick={() => setDrawerUserId(u.id)}><Eye size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="um-pagination">
              <span className="page-info">{data?.count || 0} users · Page {page} of {totalPages}</span>
              <div className="page-btns">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={14} /></button>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={14} /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer */}
      {drawerUserId && (
        <UserDrawer userId={drawerUserId} onClose={() => setDrawerUserId(null)} onRefresh={handleRefresh} />
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateUserModal onClose={() => setShowCreate(false)} onCreated={handleRefresh} />
      )}
    </div>
  );
}
