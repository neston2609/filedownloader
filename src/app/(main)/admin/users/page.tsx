'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Shield, UserCheck, ChevronDown, Plus, Mail, User as UserIcon, Lock, X, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Category { id: string; name: string }
interface User {
  id: string; email: string; username: string; role: string
  isActive: boolean; paymentStatus: string; notes: string; createdAt: string
  categoryAccess: { categoryId: string }[]
}

const EMPTY_NEW = { email: '', username: '', password: '', role: 'MEMBER', isActive: true, paymentStatus: 'pending' }

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
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
    ]).then(([u, c]) => { setUsers(u); setCategories(c) }).finally(() => setLoading(false))
  }, [])

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

  if (loading) return <div className="text-center py-16 text-slate-400">Loading users...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">User Management</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:block">{users.length} total members</span>
          <button
            onClick={() => { setShowNewForm(true); setNewUser({ ...EMPTY_NEW }); setCreateError(null) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New User
          </button>
        </div>
      </div>

      {/* New user modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowNewForm(false)}>
          <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700">
              <h2 className="font-semibold text-slate-100">Create New User</h2>
              <button onClick={() => setShowNewForm(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email" required value={newUser.email}
                    onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text" required value={newUser.username}
                    onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
                    placeholder="johndoe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password (min 8 chars)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password" required value={newUser.password}
                    onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Share this password with the user securely. They can change it from My Account after their first login.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Payment</label>
                  <select
                    value={newUser.paymentStatus}
                    onChange={e => setNewUser(u => ({ ...u, paymentStatus: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newUser.isActive}
                  onChange={e => setNewUser(u => ({ ...u, isActive: e.target.checked }))}
                  className="rounded border-slate-600"
                />
                Active immediately (can log in right away)
              </label>

              {createError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewForm(false)} className="text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-700/50 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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
          const isExpanded = expandedUser === user.id

          return (
            <div key={user.id} className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Status toggle */}
                <button
                  onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                  title={user.isActive ? 'Deactivate' : 'Activate'}
                  className="flex-shrink-0"
                >
                  {user.isActive ? (
                    <CheckCircle className="w-6 h-6 text-green-500 hover:text-green-300 transition-colors" />
                  ) : (
                    <XCircle className="w-6 h-6 text-slate-300 hover:text-green-500 transition-colors" />
                  )}
                </button>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-100">{user.username}</span>
                    {user.role === 'ADMIN' && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium">Admin</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      user.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-300' : 'bg-slate-700 text-slate-500'
                    }`}>{user.paymentStatus}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  <p className="text-xs text-slate-400">Joined {formatDate(user.createdAt)}</p>
                </div>

                {/* Payment status */}
                <select
                  value={user.paymentStatus}
                  onChange={e => updateUser(user.id, { paymentStatus: e.target.value })}
                  className="text-xs border border-slate-700 rounded-lg px-2 py-1 bg-slate-800 hidden md:block"
                >
                  {['pending', 'paid', 'expired', 'refunded'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                {/* Access count */}
                <span className="text-sm text-slate-400 hidden sm:block">
                  {accessSet.size}/{categories.length} categories
                </span>

                {/* Expand */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="text-slate-400 hover:text-slate-300 transition-colors p-1"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteUser(user.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Expanded: category permissions + notes */}
              {isExpanded && (
                <div className="border-t border-slate-700/50 p-4 bg-slate-800/50 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> Category Access
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {categories.map(cat => {
                        const has = accessSet.has(cat.id)
                        const key = `${user.id}-${cat.id}`
                        return (
                          <button
                            key={cat.id}
                            onClick={() => toggleAccess(user.id, cat.id, has)}
                            disabled={saving === key}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                              has
                                ? 'bg-blue-500/10 border-blue-500 text-blue-300 hover:bg-blue-500/20'
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-400'
                            }`}
                          >
                            {has ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span className="truncate">{cat.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 mb-1.5">Notes</h3>
                    <textarea
                      defaultValue={user.notes}
                      onBlur={e => updateUser(user.id, { notes: e.target.value })}
                      rows={2}
                      placeholder="Admin notes about this user..."
                      className="w-full text-sm border border-slate-700 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-300">Role:</label>
                    <button
                      onClick={() => updateUser(user.id, { role: user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' })}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-500/10 border-amber-300 text-amber-300 hover:bg-amber-500/20'
                          : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-400'
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
