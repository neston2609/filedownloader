'use client'
import { useState, useEffect } from 'react'
import { FolderOpen, Plus, Trash2, Pencil, X, Link2, Server, HardDrive, Lock, AlertTriangle, Terminal, FolderSearch, ImagePlus, ImageOff, Loader2, Layers, EyeOff } from 'lucide-react'
import { FolderPicker } from '@/components/FolderPicker'
import { HideRulesEditor } from '@/components/HideRulesEditor'

interface FileServer { id: string; name: string; host: string }
interface FtpServerFull extends FileServer { secure: boolean }
interface ScpServer { id: string; name: string; host: string; hasPrivateKey: boolean }
interface SmbPath { id: string; path: string; smbServer: FileServer }
interface FtpPath { id: string; path: string; ftpServer: FtpServerFull }
interface ScpPath { id: string; path: string; scpServer: FileServer }
interface CategoryGroup { id: string; name: string; description: string; sortOrder: number; _count?: { categories: number } }
interface Category {
  id: string; name: string; description: string; affiliateLinkOverride: string | null
  sortOrder: number; imageUrl: string | null; groupId: string | null
  smbPaths: SmbPath[]; ftpPaths: FtpPath[]; scpPaths: ScpPath[]
}

const EMPTY_CAT = { name: '', description: '', affiliateLinkOverride: '', sortOrder: 0, groupId: '' }

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
  const [uploadingImage, setUploadingImage] = useState<string | null>(null)
  const [imageError, setImageError] = useState<{ catId: string; msg: string } | null>(null)
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/smb').then(r => r.json()),
      fetch('/api/ftp').then(r => r.json()),
      fetch('/api/scp').then(r => r.json()),
      fetch('/api/category-groups').then(r => r.json()),
    ]).then(([cats, smb, ftp, scp, grp]) => {
      setCategories(cats)
      setSmbServers(smb)
      setFtpServers(ftp)
      setScpServers(scp)
      setGroups(Array.isArray(grp) ? grp : [])
    }).finally(() => setLoading(false))
  }, [])

  async function addGroup() {
    if (!newGroupName.trim()) return
    const res = await fetch('/api/category-groups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newGroupName.trim() }),
    })
    if (res.ok) { const created = await res.json(); setGroups(g => [...g, created]); setNewGroupName('') }
  }

  async function updateGroup(id: string, patch: { name?: string; description?: string }) {
    const res = await fetch(`/api/category-groups/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    })
    if (res.ok) { const updated = await res.json(); setGroups(g => g.map(x => x.id === id ? updated : x)) }
  }

  async function deleteGroup(id: string) {
    if (!confirm('ลบกลุ่มนี้? Category ในกลุ่มจะกลายเป็นไม่มีกลุ่ม')) return
    await fetch(`/api/category-groups/${id}`, { method: 'DELETE' })
    setGroups(g => g.filter(x => x.id !== id))
    setCategories(cs => cs.map(c => c.groupId === id ? { ...c, groupId: null } : c))
  }

  async function setCategoryGroup(catId: string, groupId: string) {
    const res = await fetch(`/api/categories/${catId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId: groupId || null }),
    })
    if (res.ok) setCategories(cs => cs.map(c => c.id === catId ? { ...c, groupId: groupId || null } : c))
  }

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
        setCategories(cs => [...cs, { ...created, smbPaths: created.smbPaths ?? [], ftpPaths: created.ftpPaths ?? [], scpPaths: created.scpPaths ?? [] }])
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

  async function uploadImage(catId: string, file: File) {
    setUploadingImage(catId)
    setImageError(null)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch(`/api/categories/${catId}/image`, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Upload failed (${res.status})`)
      setCategories(cs => cs.map(c => c.id === catId ? { ...c, imageUrl: data.imageUrl } : c))
    } catch (err) {
      setImageError({ catId, msg: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploadingImage(null)
    }
  }

  async function removeImage(catId: string) {
    if (!confirm('Remove this category image?')) return
    setUploadingImage(catId)
    try {
      const res = await fetch(`/api/categories/${catId}/image`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Remove failed (${res.status})`)
      }
      setCategories(cs => cs.map(c => c.id === catId ? { ...c, imageUrl: null } : c))
    } catch (err) {
      setImageError({ catId, msg: err instanceof Error ? err.message : 'Remove failed' })
    } finally {
      setUploadingImage(null)
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
    setForm({ name: cat.name, description: cat.description, affiliateLinkOverride: cat.affiliateLinkOverride ?? '', sortOrder: cat.sortOrder, groupId: cat.groupId ?? '' })
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

  if (loading) return <div className="text-center py-16 text-mute">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-ink">Categories</h1>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...EMPTY_CAT }) }}
          className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      {/* Category Groups management */}
      <div className="bg-paper border-[1.5px] border-ink rounded-retro p-5 mb-6 shadow-hard-sm">
        <h2 className="font-display text-xl font-bold text-ink mb-1 flex items-center gap-2">
          <Layers className="w-5 h-5 text-retro-grape" /> Category Groups
        </h2>
        <p className="text-sm text-mute mb-3">จัดกลุ่ม Category — ใช้ผูกกับแพ็กเกจสมาชิก เมื่อสมาชิกจ่ายเงินแล้วจะได้สิทธิ์ทุก Category ในกลุ่มอัตโนมัติ</p>
        <div className="space-y-2 mb-3">
          {groups.length === 0 && <span className="text-sm text-mute">ยังไม่มีกลุ่ม</span>}
          {groups.map(g => (
            <div key={g.id} className="bg-bg2 border-[1.5px] border-ink rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <input
                  defaultValue={g.name}
                  onBlur={e => e.target.value.trim() && e.target.value !== g.name && updateGroup(g.id, { name: e.target.value.trim() })}
                  className="bg-paper border-[1.5px] border-ink rounded px-2 py-1 text-sm text-ink font-semibold flex-1 min-w-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <span className="text-[10px] text-mute font-mono whitespace-nowrap">{g._count?.categories ?? 0} cat</span>
                <button onClick={() => deleteGroup(g.id)} className="text-mute hover:text-retro-coral p-0.5"><Trash2 className="w-4 h-4" /></button>
              </div>
              <textarea
                defaultValue={g.description}
                onBlur={e => e.target.value !== g.description && updateGroup(g.id, { description: e.target.value })}
                rows={2}
                placeholder="คำอธิบายกลุ่ม (แสดงในหน้า Subscription)"
                className="w-full bg-paper border-[1.5px] border-ink rounded px-2 py-1.5 text-xs text-ink placeholder-mute resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addGroup() }}
            placeholder="ชื่อกลุ่มใหม่ (เช่น Premium, หนัง, เพลง)"
            className="flex-1 max-w-xs border-[1.5px] border-ink rounded-lg px-3 py-1.5 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button onClick={addGroup} className="btn-retro inline-flex items-center gap-1.5 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-3 py-1.5 rounded-full text-xs">
            <Plus className="w-3.5 h-3.5" /> เพิ่มกลุ่ม
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-paper border-[1.5px] border-ink rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">{editId ? 'Edit Category' : 'New Category'}</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-mute" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1">Category Name *</label>
              <input type="text" value={form.name} onChange={update('name')} placeholder="Movies" className="w-full border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink2 mb-1">Sort Order</label>
              <input type="number" value={form.sortOrder} onChange={update('sortOrder')} className="w-full border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink2 mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Category Group</label>
              <select
                value={form.groupId}
                onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
                className="w-full border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="">— ไม่มีกลุ่ม —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink2 mb-1">Description</label>
              <textarea value={form.description} onChange={update('description')} rows={2} placeholder="Category description..." className="w-full border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute resize-none focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-ink2 mb-1">
                <span className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Affiliate Link Override (optional)</span>
              </label>
              <input type="url" value={form.affiliateLinkOverride} onChange={update('affiliateLinkOverride')} placeholder="https://example.com/ref/123 (overrides global link)" className="w-full border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-ink hover:bg-ink2 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-ink2 px-4 py-2 rounded-lg text-sm hover:bg-bg2 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-16 text-mute">
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
              <div key={cat.id} className="bg-paper border-[1.5px] border-ink rounded-2xl shadow-hard-sm overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {cat.imageUrl ? (
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-bg2 flex-shrink-0 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <FolderOpen className={`w-8 h-8 flex-shrink-0 ${totalPaths === 0 ? 'text-ink2' : 'text-ink'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-ink">{cat.name}</p>
                      {totalPaths === 0 && (
                        <span className="text-[10px] bg-retro-lemon text-ink px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> No paths
                        </span>
                      )}
                    </div>
                    {cat.description && <p className="text-sm text-mute truncate">{cat.description}</p>}
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-mute">
                        {totalPaths} path(s)
                        {cat.smbPaths.length > 0 && ` · ${cat.smbPaths.length} SMB`}
                        {ftpCount > 0 && ` · ${ftpCount} FTP`}
                        {ftpsCount > 0 && ` · ${ftpsCount} FTPS`}
                        {scpCount > 0 && ` · ${scpCount} SCP`}
                      </span>
                      {cat.affiliateLinkOverride && (
                        <span className="text-xs text-ink flex items-center gap-1"><Link2 className="w-3 h-3" />Custom affiliate</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-retro-grape" />
                    <select
                      value={cat.groupId ?? ''}
                      onChange={e => setCategoryGroup(cat.id, e.target.value)}
                      className="text-xs border-[1.5px] border-ink rounded-lg px-2 py-1 bg-bg2 text-ink max-w-[140px]"
                    >
                      <option value="">— No group —</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className="text-sm text-mute hover:text-ink border border-ink px-2 py-1 rounded-lg transition-colors">
                    Paths
                  </button>
                  <button onClick={() => startEdit(cat)} className="text-mute hover:text-ink transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(cat.id)} className="text-mute hover:text-retro-coral transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                </div>

                {expandedCat === cat.id && (
                  <div className="border-t border-line p-4 bg-bg2/50">
                    {/* Image upload panel */}
                    <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5">
                      <ImagePlus className="w-3.5 h-3.5" /> Category Image
                    </h3>
                    <div className="flex items-start gap-4 mb-5 p-3 bg-bg2/60 border border-ink rounded-lg">
                      <div className="w-24 h-24 rounded-lg overflow-hidden bg-bg2 border border-ink flex-shrink-0 flex items-center justify-center">
                        {cat.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="w-8 h-8 text-mute" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-mute mb-2">
                          Shown to members on the download list. JPG / PNG / WebP / GIF, max 5 MB.
                          Recommended 4:3 or 16:9, at least 600px wide.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <label className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                            uploadingImage === cat.id ? 'bg-bg2 text-mute cursor-wait' : 'bg-ink hover:bg-ink2 text-white'
                          }`}>
                            {uploadingImage === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                            {uploadingImage === cat.id ? 'Uploading…' : cat.imageUrl ? 'Replace image' : 'Upload image'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              disabled={uploadingImage === cat.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) {
                                  uploadImage(cat.id, f)
                                  e.target.value = ''
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                          {cat.imageUrl && (
                            <button
                              onClick={() => removeImage(cat.id)}
                              disabled={uploadingImage === cat.id}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-ink text-ink2 hover:bg-retro-coral/20 hover:text-retro-coral hover:border-retro-coral transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          )}
                        </div>
                        {imageError?.catId === cat.id && (
                          <p className="text-xs text-retro-coral mt-2 flex items-start gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            {imageError.msg}
                          </p>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5" /> Server Paths
                    </h3>
                    <div className="space-y-2 mb-3">
                      {cat.smbPaths.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-paper border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute">
                          <HardDrive className="w-4 h-4 text-ink flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase bg-retro-sky text-ink px-1.5 py-0.5 rounded">SMB</span>
                          <span className="font-medium text-ink">{p.smbServer.name}</span>
                          <span className="text-mute">→</span>
                          <span className="font-mono text-ink2 flex-1 truncate">{p.path}</span>
                          <button onClick={() => deletePath(cat.id, p.id, 'smb')} className="text-ink2 hover:text-retro-coral transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {cat.ftpPaths.map(p => {
                        const isFtps = p.ftpServer.secure
                        return (
                          <div key={p.id} className="flex items-center gap-3 bg-paper border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute">
                            {isFtps
                              ? <Lock className="w-4 h-4 text-green-600 flex-shrink-0" />
                              : <Server className="w-4 h-4 text-ink flex-shrink-0" />}
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isFtps ? 'bg-retro-mint text-ink' : 'bg-retro-lemon text-ink'
                            }`}>
                              {isFtps ? 'FTPS' : 'FTP'}
                            </span>
                            <span className="font-medium text-ink">{p.ftpServer.name}</span>
                            <span className="text-mute">→</span>
                            <span className="font-mono text-ink2 flex-1 truncate">{p.path}</span>
                            <button onClick={() => deletePath(cat.id, p.id, 'ftp')} className="text-ink2 hover:text-retro-coral transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      })}
                      {cat.scpPaths.map(p => (
                        <div key={p.id} className="flex items-center gap-3 bg-paper border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute">
                          <Terminal className="w-4 h-4 text-purple-500 flex-shrink-0" />
                          <span className="text-[10px] font-bold uppercase bg-retro-grape text-ink px-1.5 py-0.5 rounded">SCP</span>
                          <span className="font-medium text-ink">{p.scpServer.name}</span>
                          <span className="text-mute">→</span>
                          <span className="font-mono text-ink2 flex-1 truncate">{p.path}</span>
                          <button onClick={() => deletePath(cat.id, p.id, 'scp')} className="text-ink2 hover:text-retro-coral transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {totalPaths === 0 && (
                      <div className="flex items-start gap-2 bg-retro-lemon/30 border border-ink/40 rounded-lg px-3 py-2 text-xs text-ink mb-3">
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
                            className="border border-ink rounded-lg px-3 py-1.5 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400 bg-paper font-medium"
                          >
                            <option value="smb">📁 SMB (Windows share)</option>
                            <option value="ftp">🌐 FTP (unencrypted)</option>
                            <option value="ftps">🔒 FTPS (TLS-encrypted)</option>
                            <option value="scp">💻 SCP / SFTP (over SSH)</option>
                          </select>
                          <select
                            value={pathForm.serverId}
                            onChange={e => setPathForm(f => ({ ...f, serverId: e.target.value }))}
                            className="border border-ink rounded-lg px-3 py-1.5 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400 bg-paper"
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
                            className="border border-ink rounded-lg px-3 py-1.5 text-sm bg-bg2 text-ink placeholder-mute flex-1 min-w-[160px] focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                          />
                          <button
                            onClick={() => setPickerOpen(true)}
                            disabled={!pathForm.serverId}
                            title={pathForm.serverId ? 'Browse folders on this server' : 'Pick a server first'}
                            className="flex items-center gap-1.5 border border-ink hover:border-ink hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed text-ink2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            <FolderSearch className="w-3.5 h-3.5" />
                            Browse
                          </button>
                          <button
                            onClick={() => addPath(cat.id)}
                            disabled={!pathForm.serverId || !pathForm.path}
                            className="bg-ink hover:bg-ink2 disabled:bg-line text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Add
                          </button>
                          <button onClick={() => setAddingPath(null)} className="text-mute px-3 py-1.5 rounded-lg text-sm hover:bg-bg2 transition-colors">Cancel</button>
                        </div>
                        <p className="text-xs text-mute">{protocolHelp}</p>
                        {availableServers.length === 0 && (
                          <p className="text-xs text-ink2">
                            Tip: go to <a href={protocolAdminPath} className="underline font-medium">{protocolAdminLabel}</a> to add one first.
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingPath(cat.id); setPathForm({ protocol: 'smb', serverId: '', path: '' }) }}
                        className="flex items-center gap-1.5 text-sm text-ink hover:text-ink transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Server Path
                      </button>
                    )}

                    {/* Per-category hide rules */}
                    <h3 className="text-sm font-semibold text-ink mt-5 mb-2 flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5" /> ซ่อนไฟล์/โฟลเดอร์ (เฉพาะ Category นี้)
                    </h3>
                    <HideRulesEditor categoryId={cat.id} />
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
