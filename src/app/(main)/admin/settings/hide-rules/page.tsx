import { EyeOff } from 'lucide-react'
import { HideRulesEditor } from '@/components/HideRulesEditor'

export default function HideRulesPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ink grid place-items-center flex-shrink-0 shadow-hard-sm">
          <EyeOff className="w-5 h-5 text-retro-lime" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Hidden Files & Folders</h1>
          <p className="text-mute text-sm mt-0.5">
            ซ่อนไฟล์/โฟลเดอร์จากทุก Category เช่น ไฟล์ระบบ ภาพปก หรือไฟล์ขยะ
            (ตั้งเฉพาะ Category ได้ที่หน้า Categories)
          </p>
        </div>
      </div>
      <div className="bg-paper border-[1.5px] border-ink rounded-retro p-6 shadow-hard">
        <HideRulesEditor />
      </div>
    </div>
  )
}
