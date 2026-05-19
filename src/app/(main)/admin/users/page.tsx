'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Trash2, Shield, UserCheck, ChevronDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Category { id: string; name: string }
interface User {
  id: string; email: string; username: string; role: string
  isActive: boolean; paymentStatus: string; notes: string; createdAt: string
  categoryAccess: { categoryId: string }[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

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

  if (loading) return <div className="text-center py-16 text-slate-400">Loading users...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">User Management</h1>
        <span className="text-sm text-slate-500">{users.length} total members</span>
      </div>

      <div className="space-y-3">
        {users.map(user => {
          const accessSet = new Set(user.categoryAccess.map(a => a.categoryId))
          const isExpanded = expandedUser === user.id

          return (
            <div key={user.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Status toggle */}
                <button
                  onClick={() => updateUser(user.id, { isActive: !user.isActive })}
                  title={user.isActive ? 'Deactivate' : 'Activate'}
                  className="flex-shrink-0"
                >
                  {user.isActive ? (
                    <CheckCircle className="w-6 h-6 text-green-500 hover:text-green-700 transition-colors" />
                  ) : (
                    <XCircle className="w-6 h-6 text-slate-300 hover:text-green-500 transition-colors" />
                  )}
                </button>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{user.username}</span>
                    {user.role === 'ADMIN' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Admin</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      user.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>{user.paymentStatus}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">{user.email}</p>
                  <p className="text-xs text-slate-400">Joined {formatDate(user.createdAt)}</p>
                </div>

                {/* Payment status */}
                <select
                  value={user.paymentStatus}
                  onChange={e => updateUser(user.id, { paymentStatus: e.target.value })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white hidden md:block"
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
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
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
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
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
                                ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
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
                    <h3 className="text-sm font-semibold text-slate-700 mb-1.5">Notes</h3>
                    <textarea
                      defaultValue={user.notes}
                      onBlur={e => updateUser(user.id, { notes: e.target.value })}
                      rows={2}
                      placeholder="Admin notes about this user..."
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-600">Role:</label>
                    <button
                      onClick={() => updateUser(user.id, { role: user.role === 'ADMIN' ? 'MEMBER' : 'ADMIN' })}
                      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
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
