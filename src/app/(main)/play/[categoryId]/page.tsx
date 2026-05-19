import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download as DownloadIcon, Film } from 'lucide-react'
import path from 'path'
import { videoMimeType, isVideo } from '@/lib/media'

interface Props {
  params: { categoryId: string }
  searchParams: { pathId?: string; filePath?: string }
}

export default async function PlayPage({ params, searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const pathId = searchParams.pathId
  const filePath = searchParams.filePath
  if (!pathId || !filePath) notFound()

  // Access check
  const isAdmin = session.user.role === 'ADMIN'
  if (!isAdmin) {
    const access = await prisma.userCategoryAccess.findUnique({
      where: { userId_categoryId: { userId: session.user.id, categoryId: params.categoryId } },
    })
    if (!access) redirect('/download')
  }

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    select: { id: true, name: true },
  })
  if (!category) notFound()

  const filename = path.basename(filePath)
  const mime = videoMimeType(filename)
  const looksLikeVideo = isVideo(filename)

  // Encode query params for the stream URL
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
          <a
            href={downloadUrl}
            className="btn-retro inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-[1.5px] border-ink bg-ink text-retro-lime"
          >
            <DownloadIcon className="w-4 h-4" />
            Download
          </a>
        </div>
      </div>

      {/* Video stage — dark to maximize contrast */}
      <div className="bg-ink min-h-[calc(100vh-72px-58px)] flex items-center justify-center p-2 sm:p-6">
        {looksLikeVideo ? (
          <video
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="max-w-full max-h-[80vh] w-full rounded-2xl shadow-hard-lg shadow-retro-coral"
            style={{ aspectRatio: '16 / 9' }}
          >
            <source src={streamUrl} type={mime} />
            Your browser doesn&apos;t support HTML5 video. Use Download instead.
          </video>
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
          Browser playback works best with <span className="text-ink font-semibold">.mp4</span> (H.264) and <span className="text-ink font-semibold">.webm</span>.
          .mkv / .avi may not play — use Download instead. Seeking re-fetches from start (no range support yet).
        </div>
      </div>
    </div>
  )
}
