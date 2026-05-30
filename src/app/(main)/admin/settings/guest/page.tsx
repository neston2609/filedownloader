'use client'
import { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { SettingsShell, patchSettings, inputCls, labelCls } from '@/components/SettingsShell'

export default function GuestSettingsPage() {
  const [guestEnabled, setGuestEnabled] = useState(false)
  const [guestDailyLimit, setGuestDailyLimit] = useState(5)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setGuestEnabled(data.guestEnabled ?? false)
      setGuestDailyLimit(data.guestDailyLimit ?? 5)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return <div className="text-center py-16 text-mute">Loading…</div>

  return (
    <SettingsShell
      title="Guest Access"
      description="อนุญาตให้ผู้ที่ไม่ได้ Login เข้ามาชมคลิปได้ (Play เท่านั้น — ไม่สามารถ Download)"
      icon={<Users className="w-5 h-5" />}
      onSave={() => patchSettings({ guestEnabled, guestDailyLimit })}
    >
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={guestEnabled}
          onChange={e => setGuestEnabled(e.target.checked)}
          className="w-4 h-4 accent-ink"
        />
        <div>
          <span className="text-sm font-medium text-ink">เปิดให้ Guest เข้าชมได้</span>
          <p className="text-xs text-mute">เมื่อปิด — ผู้ที่ไม่ได้ Login จะถูก redirect ไปหน้า Login ทันที</p>
        </div>
      </label>

      {guestEnabled && (
        <div className="ml-7">
          <label className={labelCls}>จำนวนคลิปสูงสุดต่อวัน (ต่อ IP)</label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} max={100}
              className={inputCls + ' w-32'}
              value={guestDailyLimit}
              onChange={e => setGuestDailyLimit(Math.max(1, Number(e.target.value) || 5))}
            />
            <span className="text-sm text-mute">คลิป/วัน</span>
          </div>
          <p className="text-xs text-mute mt-1">เมื่อ Guest ดูครบจำนวนนี้แล้ว จะเห็นหน้าแจ้งให้สมัครสมาชิก</p>
        </div>
      )}
    </SettingsShell>
  )
}
