import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/settings'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/svg+xml': 'svg',
}
const MAX_BYTES = 2 * 1024 * 1024

function logoDir() {
  return path.join(process.cwd(), 'storage', 'uploads', 'logo')
}

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const settings = await getSiteSettings()

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }
  const file = formData.get('image')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No image (field "image")' }, { status: 400 })
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })

  const filename = `logo-${Date.now()}.${EXT_BY_MIME[file.type]}`
  const dir = logoDir()
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))
  } catch (err) {
    return NextResponse.json({ error: `Failed to save: ${(err as Error).message}` }, { status: 500 })
  }

  // Delete old logo file
  if (settings.logoUrl) {
    const old = path.basename(settings.logoUrl)
    if (old && old !== filename) await unlink(path.join(dir, old)).catch(() => {})
  }

  const url = `/uploads/logo/${filename}`
  await prisma.siteSettings.update({ where: { id: settings.id }, data: { logoUrl: url } })
  return NextResponse.json({ logoUrl: url })
}

export async function DELETE() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const settings = await getSiteSettings()
  if (settings.logoUrl) {
    const old = path.basename(settings.logoUrl)
    if (old) await unlink(path.join(logoDir(), old)).catch(() => {})
  }
  await prisma.siteSettings.update({ where: { id: settings.id }, data: { logoUrl: '' } })
  return NextResponse.json({ success: true })
}
