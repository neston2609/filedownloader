import { Megaphone } from 'lucide-react'
import { BannersEditor } from '@/components/BannersEditor'

export default function BannersPage() {
  return (
    <div className="max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-ink grid place-items-center flex-shrink-0 shadow-hard-sm">
          <Megaphone className="w-5 h-5 text-retro-lime" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">Ad Banners</h1>
          <p className="text-mute text-sm mt-0.5">แบนเนอร์โฆษณาที่แสดงด้านล่างของทุกหน้า — อัปโหลดรูป + ใส่ลิงก์ (กดแล้วเปิดแท็บใหม่)</p>
        </div>
      </div>
      <div className="bg-paper border-[1.5px] border-ink rounded-retro p-6 shadow-hard">
        <BannersEditor />
      </div>
    </div>
  )
}
