import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import path from 'path'

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

// Two valid roots: new storage dir, plus legacy public/uploads for any
// images uploaded before this refactor.
const ROOTS = [
  path.join(process.cwd(), 'storage', 'uploads'),
  path.join(process.cwd(), 'public', 'uploads'),
]

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const segments = params.path
  if (!segments || segments.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Reject any path traversal attempts before we touch the disk
  const joined = segments.join('/')
  if (joined.includes('..') || joined.includes('\\')) {
    return NextResponse.json({ error: 'Bad path' }, { status: 400 })
  }

  const ext = path.extname(joined).toLowerCase()
  const contentType = MIME_BY_EXT[ext]
  if (!contentType) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }

  for (const root of ROOTS) {
    const fullPath = path.join(root, joined)
    // Defense in depth: verify the resolved path is still inside the root
    if (!fullPath.startsWith(root)) continue
    try {
      await stat(fullPath)
      const buffer = await readFile(fullPath)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch {
      // Try the next root
    }
  }

  return NextResponse.json({ error: 'Image not found' }, { status: 404 })
}
