import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendMail, verifyEmailHtml } from '@/lib/mailer'
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
    const verifyToken = crypto.randomBytes(32).toString('hex')

    await prisma.user.create({
      data: {
        email, username, password: hashed,
        isActive: false, emailVerified: false, verifyToken,
      },
    })

    const settings = await getSiteSettings()
    const origin = req.nextUrl.origin
    const verifyUrl = `${origin}/api/auth/verify?token=${verifyToken}`

    let emailSent = false
    if (settings.smtpEnabled) {
      const result = await sendMail(
        email,
        `Confirm your email — ${settings.siteTitle}`,
        verifyEmailHtml({ username, siteTitle: settings.siteTitle, verifyUrl })
      ).catch(() => ({ ok: false, message: '' }))
      emailSent = result.ok
    }

    return NextResponse.json({
      message: emailSent
        ? 'Registration successful! Please check your email to confirm your account.'
        : 'Registration successful! Email confirmation is currently unavailable — please contact the administrator to activate your account.',
      emailSent,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
