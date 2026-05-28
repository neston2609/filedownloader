import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock, FolderOpen, ChevronRight, Sparkles, CalendarClock, UserPlus } from 'lucide-react'
import { isMembershipExpired, membershipExpiry } from '@/lib/membership'
import { ExpiredPopup } from '@/components/ExpiredPopup'
import { formatDate } from '@/lib/utils'
import { getPublicSiteSettings } from '@/lib/settings'

const ACCENT_CYCLE = ['bg-retro-lime', 'bg-retro-sky', 'bg-retro-coral', 'bg-retro-lemon', 'bg-retro-mint', 'bg-retro-grape']

export default async function DownloadPage() {
  const session = await auth()
  const isGuest = !session?.user?.id

  // If guest, check that guest access is enabled
  if (isGuest) {
    const settings = await getPublicSiteSettings()
    if (!settings.guestEnabled) redirect('/login')
  }

  const userId = session?.user?.id ?? null
  const isAdmin = session?.user?.role === 'ADMIN'

  const rawCategories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  // For guests: show all categories, no access filtering
  let accessSet = new Set<string>()
  let expired = false
  let expiry: Date | null = null

  if (!isGuest && userId) {
    const [accessRecords, hiddenRecords, groupRecords, me] = await Promise.all([
      isAdmin ? [] : prisma.userCategoryAccess.findMany({ where: { userId }, select: { categoryId: true } }),
      isAdmin ? [] : prisma.userHiddenCategory.findMany({ where: { userId }, select: { categoryId: true } }),
      isAdmin ? [] : prisma.userGroupAccess.findMany({ where: { userId }, select: { groupId: true, granted: true, hidden: true } }),
      isAdmin ? null : prisma.user.findUnique({ where: { id: userId }, select: { membershipStart: true, membershipMonths: true } }),
    ])

    const perCatHidden = new Set(hiddenRecords.map((r: { categoryId: string }) => r.categoryId))
    const perCatAccess = new Set(accessRecords.map((r: { categoryId: string }) => r.categoryId))
    const groupMap = new Map(groupRecords.map((g) => [g.groupId, g]))
    expired = me ? isMembershipExpired(me) : false
    expiry = me ? membershipExpiry(me) : null

    function resolve(cat: { id: string; groupId: string | null }): { hasAccess: boolean; hidden: boolean } {
      if (cat.groupId && groupMap.has(cat.groupId)) {
        const gs = groupMap.get(cat.groupId)!
        return { hasAccess: gs.granted, hidden: gs.hidden }
      }
      return { hasAccess: perCatAccess.has(cat.id), hidden: perCatHidden.has(cat.id) }
    }

    const visibleCategories = rawCategories.filter((c) => isAdmin || !resolve(c).hidden)
    accessSet = new Set(visibleCategories.filter((c) => isAdmin || resolve(c).hasAccess).map((c) => c.id))

    const categories = visibleCategories.map((c) => ({
      ...c,
      imageUrl: c.imageUrl && c.imageUrl.startsWith('/uploads/') ? `/api${c.imageUrl}` : c.imageUrl,
    }))

    return (
      <div>
        {expired && <ExpiredPopup expiryDate={expiry ? formatDate(expiry.toISOString()) : null} />}

        {expired && (
          <div className="mb-8 bg-retro-coral border-[1.5px] border-ink rounded-retro p-5 shadow-hard flex items-start gap-3">
            <CalendarClock className="w-6 h-6 text-white flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-display text-xl text-white font-bold">Your membership has expired</p>
              <p className="text-white/90 text-sm mt-1">
                {expiry ? `It expired on ${formatDate(expiry.toISOString())}.` : ''} All downloads are locked.
                Please contact the administrator to renew your membership.
              </p>
            </div>
          </div>
        )}

        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper border-[1.5px] border-ink mb-4 shadow-hard-sm">
            <span className="w-2 h-2 rounded-full bg-retro-coral" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink2">Member Library</span>
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-ink leading-[1.02] tracking-tight">
            Your <span className="swatch bg-retro-lime">downloads</span>,
            <br />
            one click <span className="swatch coral bg-retro-coral">away</span>
          </h1>
          <p className="text-ink2 mt-4 text-lg max-w-xl">Browse every category you have access to. Click a card to dive into the files.</p>
        </div>

        {categories.length === 0 ? (
          <EmptyState />
        ) : (
          <CategoryGrid categories={categories} accessSet={accessSet} expired={expired} expiry={expiry} isGuest={false} />
        )}
      </div>
    )
  }

  // ——— Guest view ———
  const settings = await getPublicSiteSettings()
  const categories = rawCategories.map((c) => ({
    ...c,
    imageUrl: c.imageUrl && c.imageUrl.startsWith('/uploads/') ? `/api${c.imageUrl}` : c.imageUrl,
  }))

  return (
    <div>
      {/* Guest banner */}
      <div className="mb-6 bg-retro-sky/20 border-[1.5px] border-ink rounded-retro p-4 shadow-hard-sm flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="font-semibold text-ink">คุณกำลังเข้าชมในฐานะ Guest</p>
          <p className="text-sm text-ink2 mt-0.5">
            ดูคลิปได้สูงสุด <span className="font-bold text-ink">{settings.guestDailyLimit} คลิป/วัน</span> — ไม่สามารถ Download ได้
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-[1.5px] border-ink bg-bg2 text-ink">
            Login
          </Link>
          <Link href="/register" className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border-[1.5px] border-ink bg-ink text-retro-lime">
            <UserPlus className="w-3.5 h-3.5" />
            สมัครสมาชิก
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper border-[1.5px] border-ink mb-4 shadow-hard-sm">
          <span className="w-2 h-2 rounded-full bg-retro-sky" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink2">Guest Preview</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-ink leading-[1.02] tracking-tight">
          Preview our <span className="swatch bg-retro-sky">content</span>
        </h1>
        <p className="text-ink2 mt-4 text-lg max-w-xl">สมัครสมาชิกเพื่อ download ไฟล์และเข้าถึงเนื้อหาทั้งหมด</p>
      </div>

      {categories.length === 0 ? (
        <EmptyState />
      ) : (
        <CategoryGrid categories={categories} accessSet={new Set(categories.map(c => c.id))} expired={false} expiry={null} isGuest={true} />
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-paper border-[1.5px] border-ink rounded-retro p-16 text-center shadow-hard">
      <Sparkles className="w-12 h-12 text-retro-coral mx-auto mb-4" />
      <p className="font-display text-2xl text-ink">Nothing here yet</p>
      <p className="text-ink2 mt-2 text-sm">No categories have been published. Check back soon.</p>
    </div>
  )
}

function CategoryGrid({
  categories,
  accessSet,
  expired,
  expiry,
  isGuest,
}: {
  categories: { id: string; name: string; description: string; imageUrl: string | null }[]
  accessSet: Set<string>
  expired: boolean
  expiry: Date | null
  isGuest: boolean
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {categories.map((cat, idx) => {
        const hasAccess = !expired && accessSet.has(cat.id)
        const accent = ACCENT_CYCLE[idx % ACCENT_CYCLE.length]
        return (
          <div
            key={cat.id}
            className={`card-retro relative bg-paper border-[1.5px] border-ink rounded-retro overflow-hidden flex flex-col ${
              hasAccess ? 'shadow-hard' : 'opacity-70'
            }`}
          >
            <div className={`relative aspect-video overflow-hidden ${cat.imageUrl ? 'bg-bg2' : accent}`}>
              {cat.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.imageUrl}
                  alt={cat.name}
                  className={`w-full h-full object-cover ${hasAccess ? '' : 'grayscale'}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FolderOpen className="w-16 h-16 text-ink" strokeWidth={1.5} />
                </div>
              )}
              {isGuest && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-retro-sky border-[1.5px] border-ink text-[10px] font-mono font-bold text-ink px-2.5 py-1 rounded-full uppercase tracking-wider shadow-hard-sm">
                  Guest Preview
                </span>
              )}
              {!isGuest && !hasAccess && (
                <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                  <Lock className="w-10 h-10 text-paper" strokeWidth={2} />
                </div>
              )}
              {!isGuest && hasAccess && (
                <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-retro-mint border-[1.5px] border-ink text-[10px] font-mono font-bold text-ink px-2.5 py-1 rounded-full uppercase tracking-wider shadow-hard-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                  Unlocked
                </span>
              )}
            </div>

            <div className="p-5 flex-1 flex flex-col bg-paper">
              <h3 className="font-display text-2xl font-bold text-ink leading-tight mb-1.5">{cat.name}</h3>
              {cat.description ? (
                <p className="text-[15px] leading-relaxed text-ink2 line-clamp-3 mb-4 flex-1">{cat.description}</p>
              ) : (
                <p className="text-[15px] leading-relaxed text-mute/60 italic mb-4 flex-1">No description yet.</p>
              )}

              {!isGuest && expired ? (
                <Link
                  href="/subscribe"
                  className="btn-retro mt-auto inline-flex items-center justify-center gap-1.5 w-full bg-retro-coral text-white border-[1.5px] border-ink text-sm font-semibold py-2.5 rounded-full"
                >
                  <Lock className="w-3.5 h-3.5" />
                  ต่ออายุสมาชิก
                </Link>
              ) : (
                <Link
                  href={`/download/${cat.id}`}
                  className="btn-retro mt-auto inline-flex items-center justify-center gap-1.5 w-full bg-ink text-retro-lime border-[1.5px] border-ink text-sm font-semibold py-2.5 rounded-full"
                >
                  {isGuest ? 'Preview' : hasAccess ? 'Browse files' : 'Preview'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
