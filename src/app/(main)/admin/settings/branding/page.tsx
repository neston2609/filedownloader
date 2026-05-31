'use client'
import { useState, useEffect } from 'react'
import { Globe, ImagePlus, Trash2, Loader2 } from 'lucide-react'
import { SettingsShell, patchSettings, inputCls, labelCls } from '@/components/SettingsShell'

interface BrandingFields {
  siteTitle: string
  siteTagline: string
  logoUrl: string
  logoSize: number
  heroHeading: string
  heroSubheading: string
  contactEmail: string
  cardFooterNote: string
  memberOnlyNotice: string
  loginUnverifiedNotice: string
}

const LOGO_SIZE_PRESETS = [
  { label: 'S — 36px', value: 36 },
  { label: 'M — 48px', value: 48 },
  { label: 'L — 64px', value: 64 },
  { label: 'XL — 80px', value: 80 },
  { label: 'XXL — 100px', value: 100 },
]

export default function BrandingPage() {
  const [s, setS] = useState<BrandingFields | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => setS({
      siteTitle: data.siteTitle ?? '',
      siteTagline: data.siteTagline ?? '',
      logoSize: data.logoSize ?? 36,
      logoUrl: data.logoUrl ?? '',
      heroHeading: data.heroHeading ?? '',
      heroSubheading: data.heroSubheading ?? '',
      contactEmail: data.contactEmail ?? '',
      cardFooterNote: data.cardFooterNote ?? '',
      memberOnlyNotice: data.memberOnlyNotice ?? '',
      loginUnverifiedNotice: data.loginUnverifiedNotice ?? '',
    }))
  }, [])

  function field<K extends keyof BrandingFields>(key: K, value: BrandingFields[K]) {
    setS(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/settings/logo', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) field('logoUrl', data.logoUrl)
      else alert(data.error ?? 'Upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    await fetch('/api/settings/logo', { method: 'DELETE' })
    field('logoUrl', '')
  }

  if (!s) return <div className="text-center py-16 text-mute">Loading…</div>

  const logoDisplayUrl = s.logoUrl ? `/api${s.logoUrl}` : ''

  return (
    <SettingsShell
      title="Branding & First Page"
      description="Site identity, hero text, and notifications shown to members."
      icon={<Globe className="w-5 h-5" />}
      onSave={() => patchSettings({
        siteTitle: s.siteTitle,
        siteTagline: s.siteTagline,
        logoSize: s.logoSize,
        heroHeading: s.heroHeading,
        heroSubheading: s.heroSubheading,
        contactEmail: s.contactEmail,
        cardFooterNote: s.cardFooterNote,
        memberOnlyNotice: s.memberOnlyNotice,
        loginUnverifiedNotice: s.loginUnverifiedNotice,
      })}
    >
      {/* Logo */}
      <div>
        <label className={labelCls}>Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl border-[1.5px] border-ink bg-bg2 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDisplayUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <span className="font-mono font-bold text-retro-lime text-2xl bg-ink w-full h-full flex items-center justify-center rounded-xl">SF</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="btn-retro inline-flex items-center gap-1.5 bg-retro-sky border-[1.5px] border-ink text-ink font-semibold px-3 py-1.5 rounded-full text-xs cursor-pointer">
              {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
              {s.logoUrl ? 'Replace' : 'Upload Logo'}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { uploadLogo(f); e.target.value = '' } }} />
            </label>
            {s.logoUrl && (
              <button onClick={removeLogo} className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-retro-coral border-[1.5px] border-ink px-3 py-1.5 rounded-full">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <p className="text-[11px] text-mute">PNG/JPG/SVG · max 2MB</p>
          </div>
        </div>

        {/* Logo size */}
        <div className="mt-3">
          <label className={labelCls}>Logo Size (NavBar)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {LOGO_SIZE_PRESETS.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => field('logoSize', p.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border-[1.5px] transition-colors ${
                  s.logoSize === p.value
                    ? 'bg-ink text-retro-lime border-ink'
                    : 'bg-bg2 text-ink2 border-line hover:border-ink hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
            {/* Custom input */}
            <div className="flex items-center gap-1">
              <input
                type="number" min={24} max={120}
                value={s.logoSize}
                onChange={e => field('logoSize', Math.max(24, Math.min(120, Number(e.target.value) || 36)))}
                className="w-20 bg-bg2 border-[1.5px] border-ink rounded-lg px-2 py-1 text-xs text-ink text-center focus:outline-none focus:ring-2 focus:ring-retro-sky"
              />
              <span className="text-xs text-mute">px</span>
            </div>
          </div>
          {/* Live preview */}
          <div className="mt-3 flex items-center gap-3 p-3 bg-bg2 rounded-lg border border-line">
            {logoDisplayUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoDisplayUrl} alt="preview" style={{ width: s.logoSize, height: s.logoSize }} className="rounded-xl object-contain border-[1.5px] border-ink bg-paper flex-shrink-0" />
            ) : (
              <span style={{ width: s.logoSize, height: s.logoSize }} className="rounded-xl bg-ink grid place-items-center flex-shrink-0">
                <span className="font-mono font-bold text-retro-lime" style={{ fontSize: Math.max(10, s.logoSize * 0.45) }}>SF</span>
              </span>
            )}
            <div className="leading-tight">
              <span className="font-display font-extrabold text-xl text-ink block">{s.siteTitle || 'SecureFiles'}</span>
              {s.siteTagline && <span className="text-[11px] text-ink2 block">{s.siteTagline}</span>}
            </div>
          </div>
          <p className="text-[11px] text-mute mt-1">ตัวอย่าง NavBar (ขนาดจริงอาจต่างกันเล็กน้อย)</p>
        </div>
      </div>

      {/* Site title + tagline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Site Title (บรรทัด 1)</label>
          <input className={inputCls} value={s.siteTitle} onChange={e => field('siteTitle', e.target.value)} placeholder="SecureFiles" />
          <p className="text-xs text-mute mt-1">แสดงในแถบ NavBar บรรทัดแรก</p>
        </div>
        <div>
          <label className={labelCls}>Site Tagline (บรรทัด 2)</label>
          <input className={inputCls} value={s.siteTagline} onChange={e => field('siteTagline', e.target.value)} placeholder="สโลแกนเว็บ" />
          <p className="text-xs text-mute mt-1">แสดงใต้ชื่อเว็บ ตัวเล็กกว่า (ไม่บังคับ)</p>
        </div>
      </div>

      {/* Hero */}
      <div>
        <label className={labelCls}>First-Page Header</label>
        <input className={inputCls} value={s.heroHeading} onChange={e => field('heroHeading', e.target.value)} placeholder="Download anything, from anywhere" />
        <p className="text-xs text-mute mt-1">หัวข้อหลักที่แสดงในหน้า /download</p>
      </div>
      <div>
        <label className={labelCls}>First-Page Subheading</label>
        <input className={inputCls} value={s.heroSubheading} onChange={e => field('heroSubheading', e.target.value)} placeholder="Secure, members-only file downloads." />
        <p className="text-xs text-mute mt-1">ข้อความรองใต้หัวข้อหลัก</p>
      </div>

      <hr className="border-line" />

      <div>
        <label className={labelCls}>Contact Email (shown to members)</label>
        <input className={inputCls} value={s.contactEmail} onChange={e => field('contactEmail', e.target.value)} placeholder="support@yoursite.com" />
      </div>
      <div>
        <label className={labelCls}>Membership Card — Footer Note</label>
        <input className={inputCls} value={s.cardFooterNote} onChange={e => field('cardFooterNote', e.target.value)} placeholder="เก็บบัตรนี้ไว้เป็นความลับ" />
      </div>
      <div>
        <label className={labelCls}>Members-Only Notice (ปุ่ม Download/Play ที่ถูกล็อก)</label>
        <input className={inputCls} value={s.memberOnlyNotice} onChange={e => field('memberOnlyNotice', e.target.value)} placeholder="สำหรับสมาชิกเท่านั้น…" />
      </div>
      <div>
        <label className={labelCls}>Login — Email Not Confirmed Message</label>
        <input className={inputCls} value={s.loginUnverifiedNotice} onChange={e => field('loginUnverifiedNotice', e.target.value)} placeholder="กรุณายืนยันการสมัครผ่านลิงก์…" />
      </div>
    </SettingsShell>
  )
}
