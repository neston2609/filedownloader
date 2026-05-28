import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, Download as DownloadIcon, Film, Lock, UserPlus } from 'lucide-react'
import path from 'path'
import { isVideo, isNativeBrowserVideo } from '@/lib/media'
import { checkCategoryAccess } from '@/lib/access'
import { getPublicSiteSettings } from '@/lib/settings'
import { getGuestPlayCount, todayUtc } from '@/lib/guest'

interface Props {
  params: { categoryId: string }
  searchParams: { pathId?: string; filePath?: string }
}

export default async function PlayPage({ params, searchParams }: Props) {
  const session = await auth()
  const isGuest = !session?.user?.id

  const pathId = searchParams.pathId
  const filePath = searchParams.filePath
  if (!pathId || !filePath) notFound()

  const settings = await getPublicSiteSettings()

  if (isGuest) {
    // Guest: check feature flag
    if (!settings.guestEnabled) redirect('/login')
  } else {
    // Authenticated: standard access check
    const isAdmin = session!.user.role === 'ADMIN'
    const access = await checkCategoryAccess(session!.user.id, params.categoryId, isAdmin)
    if (!access.allowed) redirect('/download')
  }

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    select: { id: true, name: true },
  })
  if (!category) notFound()

  const filename = path.basename(filePath)
  const looksLikeVideo = isVideo(filename)
  const willTranscode = looksLikeVideo && !isNativeBrowserVideo(filename)

  // Guest quota — read current count to show remaining plays in the UI
  let guestUsed = 0
  if (isGuest) {
    const headersList = headers()
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      '0.0.0.0'
    // NOTE: count shown here is BEFORE this play is incremented (increment
    // happens in /api/stream when the video actually loads).
    guestUsed = await getGuestPlayCount(ip, todayUtc())
  }

  const streamUrl = `/api/stream?categoryId=${encodeURIComponent(params.categoryId)}&pathId=${encodeURIComponent(pathId)}&filePath=${encodeURIComponent(filePath)}`
  const downloadUrl = `/api/download?categoryId=${encodeURIComponent(params.categoryId)}&pathId=${encodeURIComponent(pathId)}&filePath=${encodeURIComponent(filePath)}`

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      {/* Header bar */}
      <div className="bg-paper border-b-[1.5px] border-ink px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          <Link
            href={`/download/${category.id}`}
            className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-[1.5px] border-ink bg-bg2 text-ink"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Film className="w-4 h-4 text-retro-coral flex-shrink-0" />
            <span className="text-xs text-ink2 truncate font-mono">{category.name}</span>
            <span className="text-ink2">·</span>
            <span className="text-sm font-semibold text-ink truncate">{filename}</span>
          </div>

          {/* Download button — hidden for guests */}
          {isGuest ? (
            <Link
              href="/register"
              title="สมัครสมาชิกเพื่อ Download"
              className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-[1.5px] border-ink bg-bg2 text-ink"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:block">Register to Download</span>
            </Link>
          ) : (
            <a
              href={downloadUrl}
              className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-[1.5px] border-ink bg-ink text-retro-lime"
            >
              <DownloadIcon className="w-4 h-4" />
              Download
            </a>
          )}
        </div>
      </div>

      {/* Guest quota bar */}
      {isGuest && (
        <div className="bg-retro-sky/20 border-b-[1.5px] border-ink px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3 justify-between text-sm">
            <span className="text-ink2">
              Guest — ใช้ไปแล้ว{' '}
              <span className="font-bold text-ink">{guestUsed}/{settings.guestDailyLimit}</span>{' '}
              คลิปวันนี้
              {guestUsed >= settings.guestDailyLimit && (
                <span className="ml-2 text-retro-coral font-semibold">⚠ ครบโควต้าแล้ว</span>
              )}
            </span>
            <div className="flex gap-2">
              <Link href="/login" className="btn-retro inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border-[1.5px] border-ink bg-bg2 text-ink">Login</Link>
              <Link href="/register" className="btn-retro inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border-[1.5px] border-ink bg-ink text-retro-lime">
                <UserPlus className="w-3 h-3" /> Register
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Video stage */}
      <div className="bg-ink min-h-[calc(100vh-72px-58px)] flex items-center justify-center p-2 sm:p-6">
        {looksLikeVideo ? (
          guestUsed >= settings.guestDailyLimit && isGuest ? (
            /* Quota exceeded — show upgrade prompt instead of video */
            <div className="bg-paper border-[1.5px] border-ink rounded-retro p-8 max-w-md text-center shadow-hard-lg">
              <Lock className="w-12 h-12 text-retro-coral mx-auto mb-4" />
              <p className="font-display text-2xl text-ink mb-2">ครบโควต้า {settings.guestDailyLimit} คลิปแล้ว</p>
              <p className="text-ink2 text-sm mb-6">
                Guest สามารถดูได้สูงสุด {settings.guestDailyLimit} คลิปต่อวัน<br />
                สมัครสมาชิกเพื่อดูได้ไม่จำกัด
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/register" className="btn-retro inline-flex items-center justify-center gap-2 bg-ink text-retro-lime border-[1.5px] border-ink font-semibold px-6 py-3 rounded-full text-sm">
                  <UserPlus className="w-4 h-4" />
                  สมัครสมาชิก
                </Link>
                <Link href="/login" className="btn-retro inline-flex items-center justify-center gap-2 bg-bg2 text-ink border-[1.5px] border-ink font-semibold px-6 py-3 rounded-full text-sm">
                  มีบัญชีแล้ว? Login
                </Link>
              </div>
            </div>
          ) : (
            <video
              key={streamUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              src={streamUrl}
              className="max-w-full max-h-[80vh] w-full rounded-2xl shadow-hard-lg shadow-retro-coral bg-ink"
              style={{ aspectRatio: '16 / 9' }}
            >
              Your browser doesn&apos;t support HTML5 video. Use Download instead.
            </video>
          )
        ) : (
          <div className="bg-paper border-[1.5px] border-ink rounded-retro p-8 max-w-md text-center shadow-hard-lg">
            <p className="font-display text-2xl text-ink mb-2">Not a video</p>
            <p className="text-ink2 text-sm">This file doesn&apos;t look like a recognised video format. Try downloading it instead.</p>
          </div>
        )}
      </div>

      {/* Compatibility note */}
      <div className="bg-bg2 border-t-[1.5px] border-ink px-4 py-3">
        <div className="max-w-7xl mx-auto text-[11px] text-ink2 font-mono">
          {willTranscode ? (
            <>
              <span className="text-ink font-semibold">Transcoding live</span> — your file
              ({path.extname(filename).slice(1).toUpperCase()}) is being converted to MP4 on the server.
              First frame may take a few seconds; please don&apos;t seek backward.
            </>
          ) : (
            <>
              <span className="text-ink font-semibold">Native playback</span> — your browser is decoding the file directly. No transcoding overhead.
            </>
          )}
        </div>
      </div>
    </div>
  )
}
