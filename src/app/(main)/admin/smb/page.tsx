'use client'
import { useState, useEffect } from 'react'
import { Server, Plus, Trash2, CheckCircle, XCircle, Pencil, X, Wifi, Loader2, Info } from 'lucide-react'

interface SmbServer {
  id: string; name: string; host: string; port: number; username: string; domain: string
}

interface TestResult {
  success: boolean
  message: string
  share: string
  details?: { code?: string; errno?: string | number; stack?: string }
}

const EMPTY = { name: '', host: '', port: 445, username: '', password: '', domain: '' }
const DEFAULT_TEST_SHARE = '\\files'

export default function SmbPage() {
  const [servers, setServers] = useState<SmbServer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Test state for the form (pre-save)
  const [formTesting, setFormTesting] = useState(false)
  const [formTestShare, setFormTestShare] = useState(DEFAULT_TEST_SHARE)
  const [formTestResult, setFormTestResult] = useState<TestResult | null>(null)

  // Test state for each saved server
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})

  useEffect(() => {
    fetch('/api/smb').then(r => r.json()).then(setServers).finally(() => setLoading(false))
  }, [])

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [field]: e.target.value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const url = editId ? `/api/smb/${editId}` : '/api/smb'
      const method = editId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Save failed (${res.status})`)
      }
      const result = await res.json()
      if (editId) {
        setServers(s => s.map(srv => srv.id === editId ? result : srv))
      } else {
        setServers(s => [...s, result])
      }
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
      const res = await fetch('/api/smb/test', {
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
      const res = await fetch(`/api/smb/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share: DEFAULT_TEST_SHARE }),
      })
      const data = await res.json()
      setTestResults(r => ({ ...r, [id]: data }))
    } catch (err) {
      setTestResults(r => ({
        ...r,
        [id]: {
          success: false,
          message: err instanceof Error ? err.message : 'Test failed',
          share: DEFAULT_TEST_SHARE,
        },
      }))
    } finally {
      setTesting(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this SMB server?')) return
    await fetch(`/api/smb/${id}`, { method: 'DELETE' })
    setServers(s => s.filter(srv => srv.id !== id))
    setTestResults(r => { const c = { ...r }; delete c[id]; return c })
  }

  function startEdit(srv: SmbServer) {
    setEditId(srv.id)
    setForm({ name: srv.name, host: srv.host, port: srv.port, username: srv.username, password: '', domain: srv.domain })
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

  if (loading) return <div className="text-center py-16 text-mute">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-ink">SMB Servers</h1>
        <button
          onClick={startNew}
          className="flex items-center gap-2 bg-ink hover:bg-ink2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Server
        </button>
      </div>

      {showForm && (
        <div className="bg-paper border-[1.5px] border-ink rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">{editId ? 'Edit Server' : 'New SMB Server'}</h2>
            <button onClick={() => setShowForm(false)} className="text-mute hover:text-ink2">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Display Name', field: 'name', type: 'text', placeholder: 'My File Server' },
              { label: 'Host / IP', field: 'host', type: 'text', placeholder: '192.168.1.100' },
              { label: 'Port', field: 'port', type: 'number', placeholder: '445' },
              { label: 'Username', field: 'username', type: 'text', placeholder: 'smbuser' },
              { label: 'Password', field: 'password', type: 'password', placeholder: editId ? '(leave blank to keep current)' : 'password' },
              { label: 'Domain', field: 'domain', type: 'text', placeholder: 'WORKGROUP' },
            ].map(({ label, field, type, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-medium text-ink2 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[field as keyof typeof form]}
                  onChange={update(field)}
                  placeholder={placeholder}
                  className="w-full border border-ink rounded-lg px-3 py-2 text-sm bg-bg2 text-ink placeholder-mute focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>

          {/* Test connection panel */}
          <div className="mt-4 p-3 bg-bg2/50 border border-ink rounded-lg">
            <div className="flex items-center gap-2 flex-wrap">
              <Info className="w-3.5 h-3.5 text-mute" />
              <span className="text-xs text-ink2">Test connection — probes</span>
              <input
                type="text"
                value={formTestShare}
                onChange={e => setFormTestShare(e.target.value)}
                placeholder="\\share or \\share\\subpath"
                className="text-xs font-mono border border-ink rounded px-2 py-1 bg-bg2 text-ink placeholder-mute w-48 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-paper"
              />
              <button
                onClick={handleFormTest}
                disabled={formTesting || !form.host || !form.username}
                className="flex items-center gap-1.5 bg-bg2 hover:bg-line disabled:bg-line text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                {formTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                {formTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {formTestResult && (
              <div className={`mt-2 p-2.5 rounded-lg border text-xs ${
                formTestResult.success
                  ? 'bg-retro-mint/30 border-ink/40 text-ink'
                  : 'bg-retro-coral/20 border-retro-coral text-retro-coral'
              }`}>
                <div className="flex items-start gap-2">
                  {formTestResult.success
                    ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{formTestResult.success ? 'Connection successful' : 'Connection failed'}</p>
                    <p className="font-mono break-all mt-0.5">{formTestResult.message}</p>
                    {formTestResult.details?.code && (
                      <p className="font-mono opacity-75 mt-1">Code: {formTestResult.details.code}</p>
                    )}
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
            <div className="mt-3 p-2.5 bg-retro-coral/20 border border-retro-coral rounded-lg text-xs text-retro-coral flex items-start gap-2">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-ink hover:bg-ink2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-ink2 px-4 py-2 rounded-lg text-sm hover:bg-bg2 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Server list */}
      {servers.length === 0 ? (
        <div className="text-center py-16 text-mute">
          <Server className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No SMB servers configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map(srv => {
            const result = testResults[srv.id]
            return (
              <div key={srv.id} className="bg-paper border-[1.5px] border-ink rounded-2xl shadow-hard-sm overflow-hidden">
                <div className="p-4 flex items-center gap-4">
                  <Server className="w-8 h-8 text-ink flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{srv.name}</p>
                    <p className="text-sm text-mute font-mono">{srv.username}@{srv.host}:{srv.port}</p>
                    {srv.domain && <p className="text-xs text-mute">Domain: {srv.domain}</p>}
                  </div>

                  <button
                    onClick={() => handleServerTest(srv.id)}
                    disabled={testing === srv.id}
                    className="flex items-center gap-1.5 text-xs border border-ink px-3 py-1.5 rounded-lg hover:bg-bg2/50 transition-colors text-ink2"
                  >
                    {testing === srv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    {testing === srv.id ? 'Testing...' : 'Test'}
                  </button>
                  <button onClick={() => startEdit(srv)} className="text-mute hover:text-ink transition-colors p-1">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(srv.id)} className="text-mute hover:text-retro-coral transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {result && (
                  <div className={`border-t px-4 py-3 text-xs ${
                    result.success
                      ? 'bg-retro-mint/30 border-ink/40 text-ink'
                      : 'bg-retro-coral/20 border-retro-coral text-retro-coral'
                  }`}>
                    <div className="flex items-start gap-2">
                      {result.success
                        ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">
                          {result.success ? 'Connection successful' : 'Connection failed'}
                        </p>
                        <p className="font-mono break-all mt-0.5">{result.message}</p>
                        {result.details?.code && (
                          <p className="font-mono opacity-75 mt-1">Code: {result.details.code}</p>
                        )}
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
