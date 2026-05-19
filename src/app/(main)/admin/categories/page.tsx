'use client'
import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, X, Link2, Server, HardDrive } from 'lucide-react'

interface FileServer { id: string; name: string; host: string }
interface SmbPath { id: string; path: string; smbServer: FileServer }
interface FtpPath { id: string; path: string; ftpServer: FileServer }
interface Category {
  id: string; name: string; description: string; affiliateLinkOverride: string | null
  sortOrder: number; smbPaths: SmbPath[]; ftpPaths: FtpPath[]
}

const EMPTY_CAT = { name: '', description: '', affiliateLinkOverride: '', sortOrder: 0 }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [smbServers, setSmbServers] = useState<FileServer[]>([])
  const [ftpServers, setFtpServers] = useState<FileServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_CAT })
  const [saving, setSaving] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [addingPath, setAddingPath] = useState<string | null>(null)
  const [pathForm, setPathForm] = useState<{ protocol: 'smb' | 'ftp'; serverId: string; path: string }>({ protocol: 'smb', serverId: '', path: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/smb').then(r => r.json()),
      fetch('/api/ftp').then(r => r.json()),
    ]).then(([cats, smb, ftp]) => {
      setCategories(cats)
      setSmbServers(smb)
      setFtpServers(ftp)
    }).finally(() => setLoading(false))
  }, [])

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function refreshCategories() {
    const cats = await fetch('/api/categories').then(r => r.json())
    setCategories(cats)
  }

  async function handleSave() {
    setSaving(true)
    const body = { ...form, sortOrder: Number(form.sortOrder), affiliateLinkOverride: form.affiliateLinkOverride || null }
    if (editId) {
      const res = await fetch(`/api/categories/${editId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const updated = await res.json()
        setCategories(cs => cs.map(c => c.id === editId ? updated : c))
      }
    } else {
      const res = await fetch('/api/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) {
        const created = await res.json()
        setCategories(cs => [...cs, { ...created, smbPaths: [], ftpPaths: [] }])
      }
    }
    setSaving(false)
    setShowForm(false)
    setEditId(null)
    setForm({ ...EMPTY_CAT })
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) return
    await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    setCategories(cs => cs.filter(c => c.id !== id))
  }

  async function addPath(catId: string) {
    if (!pathForm.serverId || !pathForm.path) return

    const endpoint = pathForm.protocol === 'smb'
      ? `/api/categories/${catId}/paths`
      : `/api/categories/${catId}/ftp-paths`

    const body = pathForm.protocol === 'smb'
      ? { smbServerId: pathForm.serverId, path: pathForm.path }
      : { ftpServerId: pathForm.serverId, path: pathForm.path }

    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      await refreshCategories()
      setPathForm({ protocol: pathForm.protocol, serverId: '', path: '' })
      setAddingPath(null)
    }
  }

  async function deletePath(catId: string, pathId: string, protocol: 'smb' | 'ftp') {
    const endpoint = protocol === 'smb'
      ? `/api/categories/${catId}/paths`
      : `/api/categories/${catId}/ftp-paths`

    await fetch(endpoint, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pathId }),
    })
    await refreshCategories()
  }

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setForm({ name: cat.name, description: cat.description, affiliateLinkOverride: cat.affiliateLinkOverride ?? '', sortOrder: cat.sortOrder })
    setShowForm(true)
  }

  const availableServers = pathForm.protocol === 'smb' ? smbServers : ftpServers

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_CAT }) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">{editId ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category Name *</label>
              <input type="text" value={form.name} onChange={update('name')} placeholder="Movies" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={update('sortOrder')} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea value={form.description} onChange={update('description')} rows={2} placeholder="Category description..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Affiliate Link Override (optional)</span>
              </label>
              <input type="url" value={form.affiliateLinkOverride} onChange={update('affiliateLinkOverride')} placeholder="https://example.com/ref/123 (overrides global link)" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No categories yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map(cat => {
            const totalPaths = cat.smbPaths.length + cat.ftpPaths.length
            return (
              <div key={cat.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <FolderOpen className="w-8 h-8 text-amber-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{cat.name}</p>
                    {cat.description && <p className="text-sm text-slate-500 truncate">{cat.description}</p>}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">{totalPaths} path(s) · {cat.smbPaths.length} SMB · {cat.ftpPaths.length} FTP</span>
                      {cat.affiliateLinkOverride && (
                        <span className="text-xs text-blue-500 flex items-center gap-1"><Link2 className="w-3 h-3" />Custom affiliate</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className="text-sm text-slate-500 hover:text-blue-600 border border-slate-200 px-2 py-1 rounded-lg transition-colors">
                    Paths
                  </button>
                  <button onClick={() => startEdit(cat)} className="text-slate-400 hover:text-blue-600 transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                </div>

                {expandedCat === cat.id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" /> Server Paths
                    </h3>
                    <div className="space-y-2 mb-3">
                      {cat.smbPaths.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                          <HardDrive className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">SMB</span>
                          <span className="font-medium text-slate-700">{p.smbServer.name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-mono text-slate-600 flex-1 truncate">{p.path}</span>
                          <button onClick={() => deletePath(cat.id, p.id, 'smb')} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {cat.ftpPaths.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
                          <Server className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded">FTP</span>
                          <span className="font-medium text-slate-700">{p.ftpServer.name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-mono text-slate-600 flex-1 truncate">{p.path}</span>
                          <button onClick={() => deletePath(cat.id, p.id, 'ftp')} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {addingPath === cat.id ? (
                      <div className="flex gap-2 flex-wrap items-center">
                        <select
                          value={pathForm.protocol}
                          onChange={e => setPathForm({ protocol: e.target.value as 'smb' | 'ftp', serverId: '', path: '' })}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        >
                          <option value="smb">SMB</option>
                          <option value="ftp">FTP</option>
                        </select>
                        <select
                          value={pathForm.serverId}
                          onChange={e => setPathForm(f => ({ ...f, serverId: e.target.value }))}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        >
                          <option value="">Select {pathForm.protocol.toUpperCase()} Server</option>
                          {availableServers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input
                          type="text"
                          value={pathForm.path}
                          onChange={e => setPathForm(f => ({ ...f, path: e.target.value }))}
                          placeholder={pathForm.protocol === 'smb' ? '\\share\\folder' : '/folder/subfolder'}
                          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button onClick={() => addPath(cat.id)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">Add</button>
                        <button onClick={() => setAddingPath(null)} className="text-slate-500 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-100 transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingPath(cat.id); setPathForm({ protocol: 'smb', serverId: '', path: '' }) }}
                        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Server Path
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
