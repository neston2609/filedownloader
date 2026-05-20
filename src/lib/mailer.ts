import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'

export interface SendResult {
  ok: boolean
  message: string
}

interface SmtpConfig {
  smtpEnabled: boolean
  smtpHost: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser: string
  smtpPassword: string
  smtpFromEmail: string
  smtpFromName: string
}

function buildTransport(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure, // true for 465, false for 587 (STARTTLS)
    auth: cfg.smtpUser ? { user: cfg.smtpUser, pass: cfg.smtpPassword } : undefined,
  })
}

function fromHeader(cfg: SmtpConfig) {
  const email = cfg.smtpFromEmail || cfg.smtpUser
  return cfg.smtpFromName ? `"${cfg.smtpFromName}" <${email}>` : email
}

/** Send an email using the SMTP config stored in SiteSettings. */
export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<SendResult> {
  const settings = await prisma.siteSettings.findFirst()
  if (!settings || !settings.smtpEnabled) {
    return { ok: false, message: 'SMTP is not enabled' }
  }
  if (!settings.smtpHost) {
    return { ok: false, message: 'SMTP host not configured' }
  }

  try {
    const transport = buildTransport(settings)
    await transport.sendMail({
      from: fromHeader(settings),
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ''),
    })
    return { ok: true, message: `Sent to ${to}` }
  } catch (err) {
    console.error('sendMail failed:', err)
    return { ok: false, message: err instanceof Error ? err.message : 'Send failed' }
  }
}

/** Verify the SMTP connection without sending (used by the test button). */
export async function verifySmtp(cfg: SmtpConfig): Promise<SendResult> {
  if (!cfg.smtpHost) return { ok: false, message: 'SMTP host required' }
  try {
    const transport = buildTransport(cfg)
    await transport.verify()
    return { ok: true, message: 'SMTP connection OK' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Verify failed' }
  }
}

export function verifyEmailHtml(opts: { username: string; siteTitle: string; verifyUrl: string }): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fdfbf3;border:1.5px solid #0d1117;border-radius:16px">
    <h1 style="font-size:24px;margin:0 0 8px;color:#0d1117">Confirm your email</h1>
    <p style="color:#3d4654;line-height:1.5">Hi <strong>${opts.username}</strong>,</p>
    <p style="color:#3d4654;line-height:1.5">
      Thanks for registering at <strong>${opts.siteTitle}</strong>. Please confirm your
      email address to activate your account and start browsing the library.
    </p>
    <p style="text-align:center;margin:28px 0">
      <a href="${opts.verifyUrl}" style="display:inline-block;background:#0d1117;color:#c4ec38;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:999px">
        Confirm Email
      </a>
    </p>
    <p style="color:#6b7484;font-size:13px;line-height:1.5">
      Or paste this link into your browser:<br>
      <span style="word-break:break-all;color:#3d4654">${opts.verifyUrl}</span>
    </p>
    <p style="color:#6b7484;font-size:13px;margin-top:20px">
      After confirming you'll be able to sign in. An admin still needs to grant
      access to specific download categories.
    </p>
  </div>`
}

export function welcomeEmailHtml(opts: { username: string; siteTitle: string }): string {
  return `
  <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#fdfbf3;border:1.5px solid #0d1117;border-radius:16px">
    <h1 style="font-size:24px;margin:0 0 8px;color:#0d1117">Welcome to ${opts.siteTitle}!</h1>
    <p style="color:#3d4654;line-height:1.5">Hi <strong>${opts.username}</strong>,</p>
    <p style="color:#3d4654;line-height:1.5">
      Thanks for registering. Your account has been created and is now
      <strong>awaiting administrator approval</strong>. You'll be able to sign in
      and access your download categories once an admin activates your account
      and grants permissions.
    </p>
    <p style="color:#6b7484;font-size:13px;margin-top:24px">
      If you didn't create this account, you can ignore this email.
    </p>
  </div>`
}
