import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendMail, welcomeEmailHtml } from '@/lib/mailer'
import { getSiteSettings } from '@/lib/settings'

export async function POST(req: NextRequest) {
  try {
    const { email, username, password } = await req.json()

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing) {
      return NextResponse.json({ error: 'Email or username already taken' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.create({
      data: { email, username, password: hashed, isActive: false },
    })

    // Send welcome email (best-effort — registration succeeds even if it fails)
    try {
      const settings = await getSiteSettings()
      if (settings.smtpEnabled) {
        await sendMail(
          email,
          `Welcome to ${settings.siteTitle}`,
          welcomeEmailHtml({ username, siteTitle: settings.siteTitle })
        )
      }
    } catch (mailErr) {
      console.error('Welcome email failed (registration still succeeded):', mailErr)
    }

    return NextResponse.json({ message: 'Registration submitted. Await admin approval.' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
