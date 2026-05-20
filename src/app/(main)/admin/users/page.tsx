'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Shield, UserCheck, ChevronDown, Plus, Mail, User as UserIcon, Lock, X, AlertCircle, Eye, EyeOff, CalendarClock, Layers } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { membershipExpiry, isMembershipExpired, daysUntilExpiry, MEMBERSHIP_PRESETS } from '@/lib/membership'
import { MembershipCardButton } from '@/components/MembershipCardButton'

interface Category { id: string; name: string; groupId: string | null }
interface CategoryGroup { id: string; name: string }
interface GroupAccess { groupId: string; granted: boolean; hidden: boolean; expiresAt: string | null }
interface User {
  id: string; email: string; username: string; role: string
  isActive: boolean; paymentStatus: string; notes: string; createdAt: string
  membershipStart: string | null
  membershipMonths: number | null
  categoryAccess: { categoryId: string }[]
  hiddenCategories: { categoryId: string }[]
  groupAccess: GroupAccess[]
}

const EMPTY_NEW = { email: '', username: '', password: '', role: 'MEMBER', isActive: true, paymentStatus: 'pending' }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newUser, setNewUser] = useState({ ...EMPTY_NEW })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/category-groups').then(r => r.json()),
    ]).then(([u, c, g]) => {
      setUsers(u)
      setCategories(c)
      setGroups(Array.isArray(g) ? g : [])
    }).finally(() => setLoading(false))
  }, [])

  async function refreshUsers() {
    const updated = await fetch('/api/users').then(r => r.json())
    setUsers(updated)
  }

  async function setGroupAccess(userId: string, groupId: string, patch: { granted?: boolean; hidden?: boolean; expiresAt?: string | null }) {
    setSaving(`grp-${userId}-${groupId}`)
    await fetch(`/api/users/${userId}/group-access`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, ...patch }),
    })
    await refreshUsers()
    setSaving(null)
  }

  async function clearGroupAccess(userId: string, groupId: string) {
    setSaving(`grp-${userId}-${groupId}`)
    await fetch(`/api/users/${userId}/group-access`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId }),
    })
    await refreshUsers()
    setSaving(null)
  }

  async function updateUser(id: string, patch: Partial<User>) {
    setSaving(id)
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(us => us.map(u => u.id === id ? { ...u, ...updated } : u))
    }
    setSaving(null)
  }

  async function toggleAccess(userId: string, categoryId: string, hasAccess: boolean) {
    setSaving(`${userId}-${categoryId}`)
    if (hasAccess) {
      await fetch(`/api/users/${userId}/access`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId }),
      })
    } else {
      await fetch(`/api/users/${userId}/access`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryId }),
      })
    }
    const updated = await fetch('/api/users').then(r => r.json())
    setUsers(updated)
    setSaving(null)
  }

  async function toggleHidden(userId: string, categoryId: string, isHidden: boolean) {
    setSaving(`hide-${userId}-${categoryId}`)
    await fetch(`/api/users/${userId}/hidden`, {
      method: isHidden ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    })
    const updated = await fetch('/api/users').then(r => r.json())
    setUsers(updated)
    setSaving(null)
  }

  async function setMembership(userId: string, patch: { membershipStart?: string | null; membershipMonths?: number | null }) {
    setSaving(`mem-${userId}`)
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setUsers(us => us.map(u => u.id === userId ? { ...u, ...updated } : u))
    }
    setSaving(null)
  }

  async function deleteUser(id: string) {
    if (!confirm('Delete this user permanently?')) return
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(us => us.filter(u => u.id !== id))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)

    if (newUser.password.length < 8) {
      setCreateError('Password must be at least 8 characters')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`)
      setUsers(us => [data, ...us])
      setNewUser({ ...EMPTY_NEW })
      setShowNewForm(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <div className="text-center py-16 text-mute">Loading users...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-ink">User Management</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-mute hidden sm:block">{users.length} total members</span>
          <button
            onClick={() => { setShowNewForm(true); setNewUser({ ...EMPTY_NEW }); setCreateError(null) }}
            className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New User
          </button>
        </div>
      </div>

      {/* New user modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm" onClick={() => setShowNewForm(false)}>
          <div className="bg-paper border-[1.5px] border-ink rounded-2xl shadow-hard-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-ink">
              <h2 className="font-semibold text-ink">Create New User</h2>
              <button onClick={() => setShowNewForm(false)} className="text-mute hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink2 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                  <input
                    type="email" required value={newUser.email}
                    onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full bg-bg2 border border-ink rounded-lg py-2 pl-10 pr-3 text-sm text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink2 mb-1">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                  <input
                    type="text" required value={newUser.username}
                    onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                    placeholder="johndoe"
                    className="w-full bg-bg2 border border-ink rounded-lg py-2 pl-10 pr-3 text-sm text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink2 mb-1">Password (min 8 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mute" />
                  <input
                    type="password" required value={newUser.password}
                    onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full bg-bg2 border border-ink rounded-lg py-2 pl-10 pr-3 text-sm text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <p className="text-[11px] text-mute mt-1">Share this password with the user securely. They can change it from My Account after their first login.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                    className="w-full bg-bg2 border border-ink rounded-lg px-3 py-2 text-sm text-ink"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink2 mb-1">Payment</label>
                  <select
                    value={newUser.paymentStatus}
                    onChange={e => setNewUser(u => ({ ...u, paymentStatus: e.target.value }))}
                    className="w-full bg-bg2 border border-ink rounded-lg px-3 py-2 text-sm text-ink"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newUser.isActive}
                  onChange={e => setNewUser(u => ({ ...u, isActive: e.target.checked }))}
                  className="rounded border-ink/30"
                />
                Active immediately (can log in right away)
              </label>

              {createError && (
                <div className="flex items-start gap-2 bg-retro-coral/20 border border-retro-coral rounded-lg p-2.5 text-xs text-retro-coral">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewForm(false)} className="text-ink2 px-4 py-2 rounded-lg text-sm hover:bg-bg2 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-ink hover:bg-ink2 disabled:bg-line text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {creating ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {users.map(user => {
          const accessSet = new Set(user.categoryAccess.map(a => a.categoryId))
          const hiddenSet = new Set(user.hiddenCategories.map(h => h.categoryId))
          const groupMap = new Map(user.groupAccess.map(g => [g.groupId, g]))
          const isExpanded = expandedUser === user.id
          const expiry = membershipExpiry(user)
          const expired = isMembershipExpired(user)
          const daysLeft = daysUntilExpiry(user)

          return (
            <div key={user.id} className="bg-paper border-[1.5px] border-ink rounded-2xl shadow-hard-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Status toggle */}
                <button
                  onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                  title={user.isActive ? 'Deactivate' : 'Activate'}
                  className="flex-shrink-0"
                >
                  {user.isActive ? (
                    <CheckCircle className="w-6 h-6 text-ink hover:text-ink transition-colors" />
                  ) : (
                    <XCircle className="w-6 h-6 text-ink2 hover:text-ink transition-colors" />
                  )}
                </button>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-ink">{user.username}</span>
                    {user.role === 'ADMIN' && (
                      <span className="text-xs bg-retro-lemon text-ink px-1.5 py-0.5 rounded font-medium">Admin</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      user.paymentStatus === 'paid' ? 'bg-retro-mint text-ink' : 'bg-bg2 text-mute'
                    }`}>{user.paymentStatus}</span>
                    {expired ? (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-retro-coral text-white flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> Expired
                      </span>
                    ) : expiry && daysLeft !== null && daysLeft <= 14 ? (
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-retro-lemon text-ink flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> {daysLeft}d left
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-mute truncate">{user.email}</p>
                  <p className="text-xs text-mute">
                    Joined {formatDate(user.createdAt)}
                    {expiry && <> · Expires {formatDate(expiry.toISOString())}</>}
                    {!expiry && user.membershipMonths === null && user.membershipStart === null && <> · No membership window</>}
                  </p>
                </div>

                {/* Payment status */}
                <select
                  value={user.paymentStatus}
                  onChange={e => updateUser(user.id, { paymentStatus: e.target.value })}
                  className="text-xs border border-ink rounded-lg px-2 py-1 bg-paper hidden md:block"
                >
                  {['pending', 'paid', 'expired', 'refunded'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Access count */}
                <span className="text-sm text-mute hidden sm:block">
                  {accessSet.size}/{categories.length} categories
                </span>

                {/* Expand */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="text-mute hover:text-ink2 transition-colors p-1"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteUser(user.id)}
                  className="text-ink2 hover:text-retro-coral transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded: membership + category permissions + notes */}
              {isExpanded && (
                <div className="border-t border-line p-4 bg-bg2/50 space-y-4">
                  {/* Membership window */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5" /> Membership
                      </h3>
                      <MembershipCardButton user={{
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        membershipStart: user.membershipStart,
                        membershipExpiry: expiry ? expiry.toISOString() : null,
                        packages: user.groupAccess
                          .filter(ga => ga.granted)
                          .map(ga => ({
                            name: groups.find(g => g.id === ga.groupId)?.name ?? 'Group',
                            expiresAt: ga.expiresAt,
                          })),
                      }} />
                    </div>
                    <div className="flex flex-wrap items-end gap-3 bg-paper border-[1.5px] border-ink rounded-lg p-3">
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-mute mb-1">Start date</label>
                        <input
                          type="date"
                          value={user.membershipStart ? new Date(user.membershipStart).toISOString().slice(0, 10) : ''}
                          onChange={e => setMembership(user.id, { membershipStart: e.target.value ? new Date(e.target.value).toISOString() : null })}
                          className="text-sm border-[1.5px] border-ink rounded-lg px-2 py-1.5 bg-bg2 text-ink"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-mute mb-1">Membership length</label>
                        <select
                          value={user.membershipMonths === null ? 'null' : MEMBERSHIP_PRESETS.some(p => p.months === user.membershipMonths) ? String(user.membershipMonths) : 'custom'}
                          onChange={e => {
                            const v = e.target.value
                            if (v === 'custom') return // handled by the number input
                            setMembership(user.id, { membershipMonths: v === 'null' ? null : Number(v) })
                          }}
                          className="text-sm border-[1.5px] border-ink rounded-lg px-2 py-1.5 bg-bg2 text-ink"
                        >
                          {MEMBERSHIP_PRESETS.map(p => (
                            <option key={p.label} value={p.months === null ? 'null' : String(p.months)}>{p.label}</option>
                          ))}
                          <option value="custom">Custom…</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono uppercase tracking-wider text-mute mb-1">Custom (months)</label>
                        <input
                          type="number"
                          min={1}
                          placeholder="e.g. 9"
                          defaultValue={user.membershipMonths ?? ''}
                          onBlur={e => {
                            const n = e.target.value === '' ? null : Number(e.target.value)
                            setMembership(user.id, { membershipMonths: n })
                          }}
                          className="w-24 text-sm border-[1.5px] border-ink rounded-lg px-2 py-1.5 bg-bg2 text-ink"
                        />
                      </div>
                      <div className="text-xs text-ink2">
                        {expiry ? (
                          <span className={expired ? 'text-retro-coral font-semibold' : ''}>
                            {expired ? 'EXPIRED' : 'Expires'}: {formatDate(expiry.toISOString())}
                          </span>
                        ) : (
                          <span className="text-mute">Unlimited (no expiry)</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Group-level access & visibility (overrides per-category) */}
                  {groups.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-retro-grape" /> Group Access &amp; Visibility
                      </h3>
                      <p className="text-xs text-mute mb-2">
                        ตั้งระดับกลุ่ม — จะ <strong>Override</strong> การตั้งราย Category ของทุก Category ในกลุ่มนั้น
                      </p>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {groups.map(g => {
                          const gs = groupMap.get(g.id)
                          const set = !!gs
                          const grpExpired = gs?.granted && gs.expiresAt ? new Date(gs.expiresAt).getTime() < Date.now() : false
                          return (
                            <div key={g.id} className={`rounded-lg border-[1.5px] ${set ? 'border-retro-grape' : 'border-ink/40'} p-1.5`}>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setGroupAccess(user.id, g.id, { granted: !(gs?.granted), hidden: gs?.hidden ?? false })}
                                  disabled={saving === `grp-${user.id}-${g.id}` || gs?.hidden}
                                  className={`flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                                    gs?.granted ? 'bg-retro-mint/40 text-ink' : 'bg-paper text-mute hover:bg-bg2'
                                  }`}
                                >
                                  {gs?.granted ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                                  <span className="truncate">{g.name}</span>
                                  {set && <span className="text-[9px] font-mono bg-retro-grape/40 px-1 rounded">OVERRIDE</span>}
                                  {grpExpired && <span className="text-[9px] font-mono bg-retro-coral text-white px-1 rounded">EXPIRED</span>}
                                </button>
                                <button
                                  onClick={() => setGroupAccess(user.id, g.id, { hidden: !(gs?.hidden), granted: gs?.granted ?? false })}
                                  disabled={saving === `grp-${user.id}-${g.id}`}
                                  title="ซ่อนทุก Category ในกลุ่มนี้"
                                  className={`px-2 py-1.5 rounded transition-colors ${gs?.hidden ? 'bg-retro-coral/20 text-retro-coral' : 'bg-paper text-mute hover:text-ink'}`}
                                >
                                  {gs?.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {set && (
                                  <button
                                    onClick={() => clearGroupAccess(user.id, g.id)}
                                    title="ล้าง override (กลับไปใช้ราย Category)"
                                    className="px-2 py-1.5 rounded bg-paper text-mute hover:text-retro-coral"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              {gs?.granted && (
                                <div className="flex items-center gap-1.5 mt-1.5 px-1">
                                  <span className="text-[10px] text-mute whitespace-nowrap">หมดอายุ:</span>
                                  <input
                                    type="date"
                                    value={gs.expiresAt ? new Date(gs.expiresAt).toISOString().slice(0, 10) : ''}
                                    onChange={e => setGroupAccess(user.id, g.id, { expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                    className="text-[11px] border border-ink/40 rounded px-1.5 py-0.5 bg-bg2 text-ink"
                                  />
                                  {!gs.expiresAt && <span className="text-[10px] text-mute">(ไม่จำกัด)</span>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Category Access &amp; Visibility
                    </h3>
                    <p className="text-xs text-mute mb-2">
                      Left button = grant download access. Eye toggle = hide the category from this member entirely.
                      <span className="text-retro-grape"> Category ที่อยู่ในกลุ่มที่ตั้ง override จะถูกล็อก (จาง)</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {categories.map(cat => {
                        const overridden = !!(cat.groupId && groupMap.has(cat.groupId))
                        const gs = cat.groupId ? groupMap.get(cat.groupId) : undefined
                        const has = overridden ? !!gs?.granted : accessSet.has(cat.id)
                        const hidden = overridden ? !!gs?.hidden : hiddenSet.has(cat.id)
                        const key = `${user.id}-${cat.id}`
                        return (
                          <div key={cat.id} className={`flex items-center gap-1 rounded-lg border-[1.5px] overflow-hidden ${hidden ? 'border-ink/30 opacity-60' : 'border-ink'} ${overridden ? 'opacity-60' : ''}`}>
                            <button
                              onClick={() => toggleAccess(user.id, cat.id, has)}
                              disabled={saving === key || hidden || overridden}
                              title={overridden ? 'ถูกควบคุมโดยกลุ่ม (override)' : undefined}
                              className={`flex-1 flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                                has
                                  ? 'bg-retro-sky/30 text-ink hover:bg-retro-sky'
                                  : 'bg-paper text-mute hover:bg-bg2'
                              }`}
                            >
                              {has ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span className="truncate">{cat.name}</span>
                              {overridden && <Layers className="w-3 h-3 text-retro-grape flex-shrink-0" />}
                            </button>
                            <button
                              onClick={() => toggleHidden(user.id, cat.id, hidden)}
                              disabled={saving === `hide-${user.id}-${cat.id}` || overridden}
                              title={overridden ? 'ถูกควบคุมโดยกลุ่ม (override)' : hidden ? 'Category is hidden — click to show' : 'Click to hide this category from the member'}
                              className={`px-2 py-2 border-l-[1.5px] transition-colors ${
                                hidden
                                  ? 'bg-retro-coral/20 border-ink/30 text-retro-coral'
                                  : 'bg-paper border-ink text-mute hover:text-ink'
                              }`}
                            >
                              {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-1.5">Notes</h3>
                    <textarea
                      defaultValue={user.notes}
                      onBlur={e => updateUser(user.id, { notes: e.target.value })}
                      rows={2}
                      placeholder="Admin notes about this user..."
                      className="w-full text-sm border border-ink rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-ink2">Role:</label>
                    <button
                      onClick={() => updateUser(user.id, { role: user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' })}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                        user.role === 'ADMIN'
                          ? 'bg-retro-lemon/30 border-amber-300 text-ink2 hover:bg-amber-500/20'
                          : 'bg-bg2/50 border-ink text-ink2 hover:border-slate-400'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {user.role === 'ADMIN' ? 'Demote to Member' : 'Promote to Admin'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
