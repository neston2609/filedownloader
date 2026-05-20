import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EXT_BY_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_BYTES = 5 * 1024 * 1024

function bannerDir() {
  return path.join(process.cwd(), 'storage', 'uploads', 'banners')
}

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const banners = await prisma.banner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(banners)
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }
  const file = formData.get('image')
  const linkUrl = (formData.get('linkUrl') as string | null)?.trim() ?? ''

  if (!(file instanceof File)) return NextResponse.json({ error: 'No image (field "image")' }, { status: 400 })
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

  const filename = `banner-${Date.now()}.${EXT_BY_MIME[file.type]}`
  const dir = bannerDir()
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))
  } catch (err) {
    return NextResponse.json({ error: `Failed to save: ${(err as Error).message}` }, { status: 500 })
  }

  const banner = await prisma.banner.create({
    data: { imageUrl: `/api/uploads/banners/${filename}`, linkUrl },
  })
  return NextResponse.json(banner, { status: 201 })
}
