'use client'
import { useState, useEffect } from 'react'
import { Server, Plus, Trash2, CheckCircle, XCircle, Pencil, X, Wifi } from 'lucide-react'

interface SmbServer {
  id: string; name: string; host: string; port: number; username: string; domain: string
}

const EMPTY = { name: '', host: '', port: 445, username: '', password: '', domain: '' }

export default function SmbPage() {
  const [servers, setServers] = useState<SmbServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, boolean | null>>({})

  useEffect(() => {
    fetch('/api/smb').then(r => r.json()).then(setServers).finally(() => setLoading(false))
  }, [])

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    if (editId) {
      const res = await fetch(`/api/smb/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) {
        const updated = await res.json()
        setServers(s => s.map(srv => srv.id === editId ? updated : srv))
      }
    } else {
      const res = await fetch('/api/smb', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (res.ok) {
        const created = await res.json()
        setServers(s => [...s, created])
      }
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm({ ...EMPTY })
  }

  async function handleTest(id: string) {
    setTesting(id)
    const res = await fetch(`/api/smb/${id}/test`, { method: 'POST' })
    const data = await res.json()
    setTestResult(t => ({ ...t, [id]: data.success }))
    setTesting(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this SMB server?')) return
    await fetch(`/api/smb/${id}`, { method: 'DELETE' })
    setServers(s => s.filter(srv => srv.id !== id))
  }

  function startEdit(srv: SmbServer) {
    setEditId(srv.id)
    setForm({ name: srv.name, host: srv.host, port: srv.port, username: srv.username, password: '', domain: srv.domain })
    setShowForm(true)
  }

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">SMB Servers</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY }) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Server
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">{editId ? 'Edit Server' : 'New SMB Server'}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Display Name', field: 'name', type: 'text', placeholder: 'My File Server' },
              { label: 'Host / IP', field: 'host', type: 'text', placeholder: '192.168.1.100' },
              { label: 'Port', field: 'port', type: 'number', placeholder: '445' },
              { label: 'Username', field: 'username', type: 'text', placeholder: 'smbuser' },
              { label: 'Password', field: 'password', type: 'password', placeholder: editId ? '(leave blank to keep)' : 'password' },
              { label: 'Domain', field: 'domain', type: 'text', placeholder: 'WORKGROUP' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[field as keyof typeof form]}
                  onChange={update(field)}
                  placeholder={placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Server list */}
      {servers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No SMB servers configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map(srv => (
            <div key={srv.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <Server className="w-8 h-8 text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900">{srv.name}</p>
                <p className="text-sm text-slate-500 font-mono">{srv.username}@{srv.host}:{srv.port}</p>
                {srv.domain && <p className="text-xs text-slate-400">Domain: {srv.domain}</p>}
              </div>

              {testResult[srv.id] !== undefined && (
                testResult[srv.id]
                  ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTest(srv.id)}
                  disabled={testing === srv.id}
                  className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
                >
                  <Wifi className="w-3.5 h-3.5" />
                  {testing === srv.id ? 'Testing...' : 'Test'}
                </button>
                <button onClick={() => startEdit(srv)} className="text-slate-400 hover:text-blue-600 transition-colors p-1">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(srv.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
