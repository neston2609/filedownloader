import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

async function requireAdmin() {
  const session = await auth()
  return session?.user?.role === 'ADMIN' ? session : null
}

function uploadsDir() {
  return path.join(process.cwd(), 'public', 'uploads', 'categories')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const category = await prisma.category.findUnique({ where: { id: params.id }, select: { id: true, imageUrl: true } })
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('image')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No image file provided (field name: "image")' }, { status: 400 })
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported type ${file.type}. Use JPEG, PNG, WebP, or GIF.` }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.` }, { status: 400 })
  }

  // Cache-busting suffix so the browser picks up the new image immediately
  const ext = EXT_BY_MIME[file.type]
  const filename = `${params.id}-${Date.now()}.${ext}`
  const dir = uploadsDir()
  const fullPath = path.join(dir, filename)

  try {
    await mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(fullPath, buffer)
  } catch (err) {
    console.error('Image save failed:', err)
    return NextResponse.json({ error: 'Failed to save image to disk' }, { status: 500 })
  }

  // Remove the old image file (best-effort)
  if (category.imageUrl) {
    const oldName = path.basename(category.imageUrl)
    if (oldName && oldName !== filename) {
      await unlink(path.join(dir, oldName)).catch(() => {})
    }
  }

  const publicUrl = `/uploads/categories/${filename}`
  await prisma.category.update({ where: { id: params.id }, data: { imageUrl: publicUrl } })

  return NextResponse.json({ imageUrl: publicUrl })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const category = await prisma.category.findUnique({ where: { id: params.id }, select: { imageUrl: true } })
  if (!category) return NextResponse.json({ error: 'Category not found' }, { status: 404 })

  if (category.imageUrl) {
    const filename = path.basename(category.imageUrl)
    if (filename) await unlink(path.join(uploadsDir(), filename)).catch(() => {})
  }
  await prisma.category.update({ where: { id: params.id }, data: { imageUrl: null } })

  return NextResponse.json({ success: true })
}
