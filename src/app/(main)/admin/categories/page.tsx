'use client'
import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, X, Link2, Server, HardDrive, Lock, AlertTriangle, Terminal, FolderSearch } from 'lucide-react'
import { FolderPicker } from '@/components/FolderPicker'

interface FileServer { id: string; name: string; host: string }
interface FtpServerFull extends FileServer { secure: boolean }
interface ScpServer { id: string; name: string; host: string; hasPrivateKey: boolean }
interface SmbPath { id: string; path: string; smbServer: FileServer }
interface FtpPath { id: string; path: string; ftpServer: FtpServerFull }
interface ScpPath { id: string; path: string; scpServer: FileServer }
interface Category {
  id: string; name: string; description: string; affiliateLinkOverride: string | null
  sortOrder: number; smbPaths: SmbPath[]; ftpPaths: FtpPath[]; scpPaths: ScpPath[]
}

const EMPTY_CAT = { name: '', description: '', affiliateLinkOverride: '', sortOrder: 0 }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [smbServers, setSmbServers] = useState<FileServer[]>([])
  const [ftpServers, setFtpServers] = useState<FtpServerFull[]>([])
  const [scpServers, setScpServers] = useState<ScpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_CAT })
  const [saving, setSaving] = useState(false)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [addingPath, setAddingPath] = useState<string | null>(null)
  type Protocol = 'smb' | 'ftp' | 'ftps' | 'scp'
  const [pathForm, setPathForm] = useState<{ protocol: Protocol; serverId: string; path: string }>({ protocol: 'smb', serverId: '', path: '' })
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/smb').then(r => r.json()),
      fetch('/api/ftp').then(r => r.json()),
      fetch('/api/scp').then(r => r.json()),
    ]).then(([cats, smb, ftp, scp]) => {
      setCategories(cats)
      setSmbServers(smb)
      setFtpServers(ftp)
      setScpServers(scp)
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
    if (!confirm('Delete this category? This also removes all associated paths, user access grants, and download logs for this category.')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Delete failed (${res.status})`)
      }
      setCategories(cs => cs.filter(c => c.id !== id))
    } catch (err) {
      alert(`Could not delete category:\n\n${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  async function addPath(catId: string) {
    if (!pathForm.serverId || !pathForm.path) return

    let endpoint = ''
    let body: Record<string, string> = {}
    if (pathForm.protocol === 'smb') {
      endpoint = `/api/categories/${catId}/paths`
      body = { smbServerId: pathForm.serverId, path: pathForm.path }
    } else if (pathForm.protocol === 'scp') {
      endpoint = `/api/categories/${catId}/scp-paths`
      body = { scpServerId: pathForm.serverId, path: pathForm.path }
    } else {
      endpoint = `/api/categories/${catId}/ftp-paths`
      body = { ftpServerId: pathForm.serverId, path: pathForm.path }
    }

    const res = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    if (res.ok) {
      await refreshCategories()
      setPathForm({ protocol: pathForm.protocol, serverId: '', path: '' })
      setAddingPath(null)
    }
  }

  async function deletePath(catId: string, pathId: string, kind: 'smb' | 'ftp' | 'scp') {
    const endpoint = kind === 'smb'
      ? `/api/categories/${catId}/paths`
      : kind === 'scp'
      ? `/api/categories/${catId}/scp-paths`
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

  const availableServers: FileServer[] =
    pathForm.protocol === 'smb' ? smbServers
    : pathForm.protocol === 'ftps' ? ftpServers.filter(s => s.secure)
    : pathForm.protocol === 'scp' ? scpServers
    : ftpServers.filter(s => !s.secure)

  const protocolHelp =
    pathForm.protocol === 'smb' ? 'Use SMB for Windows shares. Format: \\share\\folder'
    : pathForm.protocol === 'ftps' ? 'FTPS = FTP over TLS. Pick a server flagged with FTPS.'
    : pathForm.protocol === 'scp' ? 'SCP / SFTP over SSH. Format: /absolute/path/to/folder'
    : 'Plain FTP (unencrypted). Pick an FTP-only server.'

  const protocolAdminPath =
    pathForm.protocol === 'smb' ? '/admin/smb'
    : pathForm.protocol === 'scp' ? '/admin/scp'
    : pathForm.protocol === 'ftps' ? '/admin/ftp?type=ftps'
    : '/admin/ftp?type=ftp'

  const protocolAdminLabel =
    pathForm.protocol === 'smb' ? 'SMB Servers'
    : pathForm.protocol === 'scp' ? 'SCP / SFTP Servers'
    : pathForm.protocol === 'ftps' ? 'FTPS Servers'
    : 'FTP Servers'

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-100">Categories</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_CAT }) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100">{editId ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category Name *</label>
              <input type="text" value={form.name} onChange={update('name')} placeholder="Movies" className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={update('sortOrder')} className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
              <textarea value={form.description} onChange={update('description')} rows={2} placeholder="Category description..." className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Affiliate Link Override (optional)</span>
              </label>
              <input type="url" value={form.affiliateLinkOverride} onChange={update('affiliateLinkOverride')} placeholder="https://example.com/ref/123 (overrides global link)" className="w-full border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-300 px-4 py-2 rounded-lg text-sm hover:bg-slate-700 transition-colors">Cancel</button>
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
            const ftpsCount = cat.ftpPaths.filter(p => p.ftpServer.secure).length
            const ftpCount = cat.ftpPaths.length - ftpsCount
            const scpCount = cat.scpPaths.length
            const totalPaths = cat.smbPaths.length + cat.ftpPaths.length + scpCount
            return (
              <div key={cat.id} className="bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <FolderOpen className={`w-8 h-8 flex-shrink-0 ${totalPaths === 0 ? 'text-slate-300' : 'text-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-100">{cat.name}</p>
                      {totalPaths === 0 && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> No paths
                        </span>
                      )}
                    </div>
                    {cat.description && <p className="text-sm text-slate-500 truncate">{cat.description}</p>}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400">
                        {totalPaths} path(s)
                        {cat.smbPaths.length > 0 && ` · ${cat.smbPaths.length} SMB`}
                        {ftpCount > 0 && ` · ${ftpCount} FTP`}
                        {ftpsCount > 0 && ` · ${ftpsCount} FTPS`}
                        {scpCount > 0 && ` · ${scpCount} SCP`}
                      </span>
                      {cat.affiliateLinkOverride && (
                        <span className="text-xs text-blue-500 flex items-center gap-1"><Link2 className="w-3 h-3" />Custom affiliate</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className="text-sm text-slate-500 hover:text-blue-400 border border-slate-700 px-2 py-1 rounded-lg transition-colors">
                    Paths
                  </button>
                  <button onClick={() => startEdit(cat)} className="text-slate-400 hover:text-blue-400 transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                </div>

                {expandedCat === cat.id && (
                  <div className="border-t border-slate-700/50 p-4 bg-slate-800/50">
                    <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" /> Server Paths
                    </h3>
                    <div className="space-y-2 mb-3">
                      {cat.smbPaths.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500">
                          <HardDrive className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">SMB</span>
                          <span className="font-medium text-slate-200">{p.smbServer.name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-mono text-slate-300 flex-1 truncate">{p.path}</span>
                          <button onClick={() => deletePath(cat.id, p.id, 'smb')} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {cat.ftpPaths.map(p => {
                        const isFtps = p.ftpServer.secure
                        return (
                          <div key={p.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500">
                            {isFtps
                              ? <Lock className="w-4 h-4 text-green-600 flex-shrink-0" />
                              : <Server className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isFtps ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {isFtps ? 'FTPS' : 'FTP'}
                            </span>
                            <span className="font-medium text-slate-200">{p.ftpServer.name}</span>
                            <span className="text-slate-400">→</span>
                            <span className="font-mono text-slate-300 flex-1 truncate">{p.path}</span>
                            <button onClick={() => deletePath(cat.id, p.id, 'ftp')} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                      {cat.scpPaths.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm bg-slate-900 text-slate-100 placeholder-slate-500">
                          <Terminal className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">SCP</span>
                          <span className="font-medium text-slate-200">{p.scpServer.name}</span>
                          <span className="text-slate-400">→</span>
                          <span className="font-mono text-slate-300 flex-1 truncate">{p.path}</span>
                          <button onClick={() => deletePath(cat.id, p.id, 'scp')} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {totalPaths === 0 && (
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-200 mb-3">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>This category has no paths yet. Members with access will see an empty folder. Add at least one path below.</span>
                      </div>
                    )}

                    {addingPath === cat.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 flex-wrap items-center">
                          <select
                            value={pathForm.protocol}
                            onChange={e => setPathForm({ protocol: e.target.value as Protocol, serverId: '', path: '' })}
                            className="border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-slate-800 font-medium"
                          >
                            <option value="smb">📁 SMB (Windows share)</option>
                            <option value="ftp">🌐 FTP (unencrypted)</option>
                            <option value="ftps">🔒 FTPS (TLS-encrypted)</option>
                            <option value="scp">💻 SCP / SFTP (over SSH)</option>
                          </select>
                          <select
                            value={pathForm.serverId}
                            onChange={e => setPathForm(f => ({ ...f, serverId: e.target.value }))}
                            className="border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-slate-800"
                          >
                            <option value="">
                              {availableServers.length === 0
                                ? `No ${pathForm.protocol.toUpperCase()} servers configured`
                                : `Select ${pathForm.protocol.toUpperCase()} Server`}
                            </option>
                            {availableServers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.host})</option>)}
                          </select>
                          <input
                            type="text"
                            value={pathForm.path}
                            onChange={e => setPathForm(f => ({ ...f, path: e.target.value }))}
                            placeholder={pathForm.protocol === 'smb' ? '\\share\\folder' : pathForm.protocol === 'scp' ? '/home/user/files' : '/folder/subfolder'}
                            className="border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900 text-slate-100 placeholder-slate-500 flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                          />
                          <button
                            onClick={() => setPickerOpen(true)}
                            disabled={!pathForm.serverId}
                            title={pathForm.serverId ? 'Browse folders on this server' : 'Pick a server first'}
                            className="flex items-center gap-1.5 border border-slate-700 hover:border-blue-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            <FolderSearch className="w-3.5 h-3.5" />
                            Browse
                          </button>
                          <button
                            onClick={() => addPath(cat.id)}
                            disabled={!pathForm.serverId || !pathForm.path}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Add
                          </button>
                          <button onClick={() => setAddingPath(null)} className="text-slate-500 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-700 transition-colors">Cancel</button>
                        </div>
                        <p className="text-xs text-slate-500">{protocolHelp}</p>
                        {availableServers.length === 0 && (
                          <p className="text-xs text-amber-300">
                            Tip: go to <a href={protocolAdminPath} className="underline font-medium">{protocolAdminLabel}</a> to add one first.
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingPath(cat.id); setPathForm({ protocol: 'smb', serverId: '', path: '' }) }}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
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

      {pickerOpen && pathForm.serverId && (
        <FolderPicker
          protocol={pathForm.protocol}
          serverId={pathForm.serverId}
          serverName={availableServers.find(s => s.id === pathForm.serverId)?.name ?? ''}
          initialPath={pathForm.path || undefined}
          onSelect={(p) => {
            setPathForm(f => ({ ...f, path: p }))
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
