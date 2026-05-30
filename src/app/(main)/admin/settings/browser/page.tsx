'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { SettingsShell, patchSettings, inputCls, labelCls } from '@/components/SettingsShell'

export default function BrowserSettingsPage() {
  const [pageSize, setPageSize] = useState(20)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setPageSize(data.fileBrowserPageSize ?? 20)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return <div className="text-center py-16 text-mute">Loading…</div>

  return (
    <SettingsShell
      title="File Browser"
      description="กำหนดการแสดงผลไฟล์และโฟลเดอร์ในหน้า browse"
      icon={<SlidersHorizontal className="w-5 h-5" />}
      onSave={() => patchSettings({ fileBrowserPageSize: pageSize })}
    >
      <div>
        <label className={labelCls}>จำนวนไฟล์/โฟลเดอร์ต่อหน้า</label>
        <div className="flex items-center gap-3">
          <input
            type="number" min={5} max={200}
            className={inputCls + ' w-32'}
            value={pageSize}
            onChange={e => setPageSize(Math.max(5, Math.min(200, Number(e.target.value) || 20)))}
          />
          <span className="text-sm text-mute">รายการ/หน้า</span>
        </div>
        <p className="text-xs text-mute mt-1">
          แนะนำ 20–50 รายการ — เมื่อไฟล์เกินจำนวนนี้จะแบ่งเป็นหลายหน้าให้อัตโนมัติ (ค่าเริ่มต้น 20)
        </p>
      </div>

      <div className="bg-bg2 border border-line rounded-lg p-4">
        <p className="text-xs text-ink2 font-mono">Preview: ถ้าโฟลเดอร์มี 100 ไฟล์</p>
        <p className="text-sm text-ink mt-1">
          จะแบ่งเป็น <span className="font-bold">{Math.ceil(100 / pageSize)}</span> หน้า
          ({pageSize} รายการ/หน้า)
        </p>
      </div>
    </SettingsShell>
  )
}
