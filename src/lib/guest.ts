import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/** Extract the real client IP, honouring X-Forwarded-For from a reverse proxy. */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '0.0.0.0'
  )
}

/** Get today's date string in UTC (YYYY-MM-DD). */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Return how many streams this IP has used today. */
export async function getGuestPlayCount(ip: string, date: string): Promise<number> {
  const log = await prisma.guestPlayLog.findUnique({ where: { ip_date: { ip, date } } })
  return log?.count ?? 0
}

/**
 * Key used in GuestPlayLog for logged-in members without subscription.
 * Prefixed so it never collides with an IP address.
 */
export function memberPlayKey(userId: string): string {
  return `user:${userId}`
}

/**
 * Atomically increment the guest play count for this IP + date.
 * Returns the NEW count after incrementing.
 */
export async function incrementGuestPlay(ip: string, date: string): Promise<number> {
  const log = await prisma.guestPlayLog.upsert({
    where: { ip_date: { ip, date } },
    create: { ip, date, count: 1 },
    update: { count: { increment: 1 } },
  })
  return log.count
}
