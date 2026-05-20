'use client'
import { useState } from 'react'
import { CalendarClock, X } from 'lucide-react'

export function ExpiredPopup({ expiryDate }: { expiryDate: string | null }) {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm">
      <div className="bg-paper border-[1.5px] border-ink rounded-retro shadow-hard-lg max-w-md w-full p-6 text-center relative">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 text-mute hover:text-ink transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-retro-coral border-[1.5px] border-ink shadow-hard-sm mb-4">
          <CalendarClock className="w-8 h-8 text-white" />
        </div>

        <h2 className="font-display text-2xl font-extrabold text-ink mb-2">Membership Expired</h2>
        <p className="text-ink2 text-sm leading-relaxed">
          Your membership{expiryDate ? ` expired on ${expiryDate}` : ' has expired'}. Access to all
          download categories is now locked.
        </p>
        <p className="text-ink2 text-sm mt-3">
          Please contact the administrator to renew and restore your access.
        </p>

        <button
          onClick={() => setOpen(false)}
          className="btn-retro mt-5 inline-flex items-center justify-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-6 py-2.5 rounded-full"
        >
          Understood
        </button>
      </div>
    </div>
  )
}
