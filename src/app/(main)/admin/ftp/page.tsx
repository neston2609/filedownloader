'use client'
import { useState, useEffect } from 'react'
import { Server, Plus, Trash2, CheckCircle, XCircle, Pencil, X, Wifi, Loader2, Info, Lock } from 'lucide-react'

interface FtpServer {
  id: string; name: string; host: string; port: number; username: string; secure: boolean; passive: boolean
}

interface TestResult {
  success: boolean
  message: string
  share: string
  details?: { code?: string | number; stack?: string }
}

const EMPTY = { name: '', host: '', port: 21, username: '', password: '', secure: false, passive: true }
const DEFAULT_TEST_SHARE = '/'

export default function FtpPage() {
  const [servers, setServers] = useState<FtpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [formTesting, setFormTesting] = useState(false)
  const [formTestShare, setFormTestShare] = useState(DEFAULT_TEST_SHARE)
  const [formTestResult, setFormTestResult] = useState<TestResult | null>(null)

  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  useEffect(() => {
    fetch('/api/ftp').then(r => r.json()).then(setServers).finally(() => setLoading(false))
  }, [])

  function setField<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const url = editId ? `/api/ftp/${editId}` : '/api/ftp'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Save failed (${res.status})`)
      }
      const result = await res.json()
      if (editId) setServers(s => s.map(srv => srv.id === editId ? result : srv))
      else setServers(s => [...s, result])
      setShowForm(false)
      setEditId(null)
      setForm({ ...EMPTY })
      setFormTestResult(null)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleFormTest() {
    setFormTesting(true)
    setFormTestResult(null)
    try {
      const res = await fetch('/api/ftp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: editId, share: formTestShare }),
      })
      const data = await res.json()
      setFormTestResult(data)
    } catch (err) {
      setFormTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
        share: formTestShare,
      })
    } finally {
      setFormTesting(false)
    }
  }

  async function handleServerTest(id: string) {
    setTesting(id)
    try {
      const res = await fetch(`/api/ftp/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share: DEFAULT_TEST_SHARE }),
      })
      const data = await res.json()
      setTestResults(r => ({ ...r, [id]: data }))
    } catch (err) {
      setTestResults(r => ({
        ...r,
        [id]: { success: false, message: err instanceof Error ? err.message : 'Test failed', share: DEFAULT_TEST_SHARE },
      }))
    } finally {
      setTesting(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this FTP server?')) return
    await fetch(`/api/ftp/${id}`, { method: 'DELETE' })
    setServers(s => s.filter(srv => srv.id !== id))
    setTestResults(r => { const c = { ...r }; delete c[id]; return c })
  }

  function startEdit(srv: FtpServer) {
    setEditId(srv.id)
    setForm({ name: srv.name, host: srv.host, port: srv.port, username: srv.username, password: '', secure: srv.secure, passive: srv.passive })
    setShowForm(true)
    setFormTestResult(null)
    setSaveError(null)
  }

  function startNew() {
    setShowForm(true)
    setEditId(null)
    setForm({ ...EMPTY })
    setFormTestResult(null)
    setSaveError(null)
  }

  if (loading) return <div className="text-center py-16 text-slate-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-slate-900">FTP Servers</h1>
        <button onClick={startNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Server
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">{editId ? 'Edit Server' : 'New FTP Server'}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Display Name</label>
              <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="My FTP Server" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Host / IP</label>
              <input type="text" value={form.host} onChange={e => setField('host', e.target.value)} placeholder="ftp.example.com" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Port</label>
              <input type="number" value={form.port} onChange={e => setField('port', Number(e.target.value) || 21)} placeholder="21" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
              <input type="text" value={form.username} onChange={e => setField('username', e.target.value)} placeholder="ftpuser (or 'anonymous')" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setField('password', e.target.value)} placeholder={editId ? '(leave blank to keep current)' : 'password'} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.secure} onChange={e => setField('secure', e.target.checked)} className="rounded border-slate-300" />
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                FTPS (TLS)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.passive} onChange={e => setField('passive', e.target.checked)} className="rounded border-slate-300" />
                Passive mode
              </label>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-600">Test connection — probes</span>
              <input
                type="text"
                value={formTestShare}
                onChange={e => setFormTestShare(e.target.value)}
                placeholder="/"
                className="text-xs font-mono border border-slate-200 rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
              />
              <button onClick={handleFormTest} disabled={formTesting || !form.host || !form.username} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                {formTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                {formTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {formTestResult && (
              <div className={`mt-2 p-2.5 rounded-lg border text-xs ${formTestResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <div className="flex items-start gap-2">
                  {formTestResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{formTestResult.success ? 'Connection successful' : 'Connection failed'}</p>
                    <p className="font-mono break-all mt-0.5">{formTestResult.message}</p>
                    {formTestResult.details?.code && <p className="font-mono opacity-75 mt-1">Code: {formTestResult.details.code}</p>}
                    {formTestResult.details?.stack && (
                      <details className="mt-1">
                        <summary className="cursor-pointer opacity-75">Stack trace</summary>
                        <pre className="text-[10px] mt-1 whitespace-pre-wrap opacity-70">{formTestResult.details.stack}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {saveError && (
            <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No FTP servers configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map(srv => {
            const result = testResults[srv.id]
            return (
              <div key={srv.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <Server className="w-8 h-8 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{srv.name}</p>
                      {srv.secure && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium flex items-center gap-1"><Lock className="w-3 h-3" />FTPS</span>}
                    </div>
                    <p className="text-sm text-slate-500 font-mono">{srv.username}@{srv.host}:{srv.port}</p>
                    <p className="text-xs text-slate-400">{srv.passive ? 'Passive' : 'Active'} mode</p>
                  </div>

                  <button onClick={() => handleServerTest(srv.id)} disabled={testing === srv.id} className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-slate-600">
                    {testing === srv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    {testing === srv.id ? 'Testing...' : 'Test'}
                  </button>
                  <button onClick={() => startEdit(srv)} className="text-slate-400 hover:text-blue-600 transition-colors p-1"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(srv.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                </div>

                {result && (
                  <div className={`border-t px-4 py-3 text-xs ${result.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    <div className="flex items-start gap-2">
                      {result.success ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{result.success ? 'Connection successful' : 'Connection failed'}</p>
                        <p className="font-mono break-all mt-0.5">{result.message}</p>
                        {result.details?.code && <p className="font-mono opacity-75 mt-1">Code: {result.details.code}</p>}
                        {result.details?.stack && (
                          <details className="mt-1">
                            <summary className="cursor-pointer opacity-75">Stack trace</summary>
                            <pre className="text-[10px] mt-1 whitespace-pre-wrap opacity-70">{result.details.stack}</pre>
                          </details>
                        )}
                      </div>
                    </div>
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
