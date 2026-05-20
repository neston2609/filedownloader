'use client'
import { useState } from 'react'
import { Printer, X, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface CardUser {
  id: string
  username: string
  email: string
  membershipStart: string | null
  membershipExpiry: string | null
}

function genPassword(): string {
  // Readable: no ambiguous chars (0/O, 1/l/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let p = ''
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildCardHtml(opts: {
  siteTitle: string
  loginUrl: string
  username: string
  password: string
  email: string
  membershipStart: string | null
  membershipExpiry: string | null
}): string {
  const start = opts.membershipStart ? formatDate(opts.membershipStart) : '-'
  const expiry = opts.membershipExpiry ? formatDate(opts.membershipExpiry) : 'ไม่จำกัด'
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<title>บัตรสมาชิก — ${escapeHtml(opts.username)}</title>
<style>
  @page { size: A5 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Geist', 'Segoe UI', system-ui, sans-serif;
    width: 148mm; height: 210mm; padding: 12mm;
    background: #f4f1e8; color: #0d1117;
  }
  .card { border: 2px solid #0d1117; border-radius: 14px; background: #fdfbf3; height: 100%; padding: 9mm; display: flex; flex-direction: column; }
  .head { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0d1117; padding-bottom: 5mm; margin-bottom: 5mm; }
  .brand { font-size: 20pt; font-weight: 800; letter-spacing: -0.5px; }
  .badge { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; background: #c4ec38; border: 1.5px solid #0d1117; border-radius: 999px; padding: 3px 10px; }
  h2 { font-size: 11pt; margin: 4mm 0 2mm; text-transform: uppercase; letter-spacing: 0.5px; color: #3d4654; }
  .creds { background: #ebe6d6; border: 1.5px solid #0d1117; border-radius: 10px; padding: 4mm 5mm; }
  .row { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 11pt; }
  .row .k { color: #6b7484; }
  .row .v { font-weight: 700; font-family: 'JetBrains Mono', monospace; }
  ol, ul { margin: 1mm 0 0; padding-left: 6mm; font-size: 9.5pt; line-height: 1.6; color: #3d4654; }
  .two { display: flex; gap: 4mm; }
  .two > div { flex: 1; background: #fdfbf3; border: 1.5px solid #0d1117; border-radius: 10px; padding: 3mm 4mm; }
  .pill { display: inline-block; font-size: 8pt; font-weight: 700; background: #5bcaff; border: 1.5px solid #0d1117; border-radius: 999px; padding: 1px 8px; margin-bottom: 1.5mm; }
  .pill.coral { background: #ff6b4a; color: #fff; }
  .foot { margin-top: auto; border-top: 1.5px dashed #0d1117; padding-top: 3mm; font-size: 8pt; color: #6b7484; text-align: center; }
  .url { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #0d1117; }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <div class="brand">${escapeHtml(opts.siteTitle)}</div>
      <div class="badge">บัตรสมาชิก</div>
    </div>

    <h2>ข้อมูลบัญชี</h2>
    <div class="creds">
      <div class="row"><span class="k">Username</span><span class="v">${escapeHtml(opts.username)}</span></div>
      <div class="row"><span class="k">Password</span><span class="v">${escapeHtml(opts.password)}</span></div>
      ${opts.email ? `<div class="row"><span class="k">Email</span><span class="v" style="font-size:9pt">${escapeHtml(opts.email)}</span></div>` : ''}
      <div class="row"><span class="k">เริ่มสมาชิก</span><span class="v" style="font-size:9pt">${start}</span></div>
      <div class="row"><span class="k">หมดอายุ</span><span class="v" style="font-size:9pt">${expiry}</span></div>
    </div>

    <h2>วิธีเข้าสู่ระบบ</h2>
    <ol>
      <li>เปิดเว็บไซต์ <span class="url">${escapeHtml(opts.loginUrl)}</span></li>
      <li>กรอก Username หรือ Email และ Password ตามด้านบน</li>
      <li>กดปุ่ม "Sign In" เพื่อเข้าใช้งาน</li>
    </ol>

    <h2>การใช้งานเบื้องต้น</h2>
    <div class="two">
      <div>
        <span class="pill">DOWNLOAD</span>
        <div style="font-size:9pt;color:#3d4654;line-height:1.5">เปิดหมวดหมู่ที่ได้รับสิทธิ์ แล้วกดปุ่ม <b>Download</b> ที่ไฟล์เพื่อบันทึกลงเครื่อง</div>
      </div>
      <div>
        <span class="pill coral">PLAY</span>
        <div style="font-size:9pt;color:#3d4654;line-height:1.5">ไฟล์วิดีโอจะมีปุ่ม <b>Play</b> กดเพื่อรับชมผ่านเบราว์เซอร์ได้ทันที</div>
      </div>
    </div>

    <h2>การต่ออายุสมาชิก</h2>
    <ol>
      <li>เข้าเมนู <b>Subscribe</b></li>
      <li>เลือกแพ็กเกจที่ต้องการ แล้วโอนเงินตามข้อมูลบัญชี/QR</li>
      <li>กด <b>แจ้งชำระเงิน</b> และอัปโหลดสลิป รอแอดมินยืนยัน</li>
    </ol>

    <div class="foot">เก็บบัตรนี้ไว้เป็นความลับ • ออกเมื่อ ${formatDate(new Date().toISOString())}</div>
  </div>
  <script>window.onload = function(){ setTimeout(function(){ window.focus(); window.print(); }, 250); };</script>
</body>
</html>`
}

export function MembershipCardButton({ user }: { user: CardUser }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [doReset, setDoReset] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openModal() {
    setPassword(genPassword())
    setDoReset(true)
    setError(null)
    setOpen(true)
  }

  async function handlePrint() {
    setPrinting(true)
    setError(null)
    try {
      if (doReset) {
        if (password.length < 8) { setError('Password ต้องยาวอย่างน้อย 8 ตัวอักษร'); setPrinting(false); return }
        const res = await fetch(`/api/users/${user.id}/password`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }),
        })
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error ?? 'ตั้งรหัสผ่านไม่สำเร็จ')
        }
      }

      let siteTitle = 'SecureFiles'
      try {
        const s = await fetch('/api/public-settings').then(r => r.json())
        if (s?.siteTitle) siteTitle = s.siteTitle
      } catch { /* default */ }

      const html = buildCardHtml({
        siteTitle,
        loginUrl: `${window.location.origin}/login`,
        username: user.username,
        password,
        email: user.email,
        membershipStart: user.membershipStart,
        membershipExpiry: user.membershipExpiry,
      })

      const w = window.open('', '_blank', 'width=620,height=860')
      if (!w) { setError('เบราว์เซอร์บล็อกป๊อปอัป — กรุณาอนุญาตป๊อปอัปสำหรับเว็บนี้'); setPrinting(false); return }
      w.document.write(html)
      w.document.close()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="btn-retro inline-flex items-center gap-1.5 bg-retro-grape border-[1.5px] border-ink text-ink font-semibold px-3 py-1.5 rounded-full text-xs"
      >
        <Printer className="w-3.5 h-3.5" /> Print Membership Card
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-paper border-[1.5px] border-ink rounded-retro shadow-hard-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-ink flex items-center gap-2">
                <Printer className="w-5 h-5" /> Print Membership Card
              </h2>
              <button onClick={() => setOpen(false)} className="text-mute hover:text-ink"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-sm text-ink2 mb-3">
              พิมพ์บัตรสมาชิกขนาด A5 สำหรับ <strong>{user.username}</strong>
            </p>

            <div className="bg-retro-lemon/30 border-[1.5px] border-ink rounded-lg p-3 mb-4 text-xs text-ink2 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>รหัสผ่านปัจจุบันถูกเข้ารหัสไว้ ไม่สามารถอ่านได้ จึงต้องตั้งรหัสใหม่เพื่อพิมพ์ลงบัตรให้ตรงกัน</span>
            </div>

            <label className="block text-xs font-mono uppercase tracking-wider text-mute mb-1">รหัสผ่านที่จะพิมพ์</label>
            <div className="flex gap-2 mb-3">
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="flex-1 bg-bg2 border-[1.5px] border-ink rounded-lg px-3 py-2 text-sm font-mono text-ink"
              />
              <button onClick={() => setPassword(genPassword())} className="btn-retro inline-flex items-center gap-1 bg-bg2 border-[1.5px] border-ink text-ink px-3 rounded-lg text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5" /> สุ่ม
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink mb-4 cursor-pointer">
              <input type="checkbox" checked={doReset} onChange={e => setDoReset(e.target.checked)} className="w-4 h-4 accent-ink" />
              ตั้งรหัสผ่านของสมาชิกเป็นค่านี้ (แนะนำ เพื่อให้ล็อกอินได้จริง)
            </label>

            {error && (
              <div className="bg-retro-coral/20 border border-retro-coral rounded-lg p-2.5 mb-4 text-xs text-retro-coral flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="text-ink2 px-4 py-2 rounded-full text-sm hover:bg-bg2">ยกเลิก</button>
              <button onClick={handlePrint} disabled={printing} className="btn-retro inline-flex items-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-5 py-2 rounded-full text-sm">
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {printing ? 'กำลังเตรียม…' : 'พิมพ์บัตร'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
