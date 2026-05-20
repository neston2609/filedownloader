import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/settings'
import { sendMail } from '@/lib/mailer'
import { writeFile, mkdir, unlink } from 'fs/promises'
import path from 'path'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
}
const MAX_BYTES = 8 * 1024 * 1024

function slipDir() {
  return path.join(process.cwd(), 'storage', 'uploads', 'slips')
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const request = await prisma.subscriptionRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (request.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (request.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  let formData: FormData
  try { formData = await req.formData() } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }
  const file = formData.get('slip')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file (field "slip")' }, { status: 400 })
  if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `Unsupported type ${file.type}` }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })

  const filename = `${params.id}-${Date.now()}.${EXT_BY_MIME[file.type]}`
  const dir = slipDir()
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))
  } catch (err) {
    return NextResponse.json({ error: `Failed to save: ${(err as Error).message}` }, { status: 500 })
  }

  // Remove old slip if replacing
  if (request.slipUrl) {
    const old = path.basename(request.slipUrl)
    if (old && old !== filename) await unlink(path.join(dir, old)).catch(() => {})
  }

  const slipUrl = `/api/uploads/slips/${filename}`
  const updated = await prisma.subscriptionRequest.update({
    where: { id: params.id },
    data: { slipUrl, status: 'wait_confirm' },
  })

  // Notify admin contact point
  try {
    const settings = await getSiteSettings()
    const to = settings.contactEmail || settings.smtpFromEmail || settings.smtpUser
    if (settings.smtpEnabled && to) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true, email: true } })
      await sendMail(
        to,
        `[${settings.siteTitle}] Payment slip uploaded — ${request.planName}`,
        `<div style="font-family:system-ui,sans-serif">
          <h2>New payment awaiting confirmation</h2>
          <p><strong>${user?.username ?? 'A member'}</strong> (${user?.email ?? ''}) uploaded a payment slip.</p>
          <ul>
            <li>Plan: <strong>${request.planName}</strong> (${request.months} months)</li>
            <li>Amount: <strong>฿${request.priceThb.toLocaleString()}</strong></li>
          </ul>
          <p>Review it in the admin Subscriptions page and mark it Paid or Failed.</p>
        </div>`
      )
    }
  } catch (mailErr) {
    console.error('Slip notification email failed:', mailErr)
  }

  return NextResponse.json(updated)
}
