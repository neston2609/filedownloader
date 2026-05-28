import { prisma } from '@/lib/prisma'

export type AccessLogType = 'LOGIN' | 'GUEST_BROWSE' | 'GUEST_PLAY' | 'MEMBER_PLAY'

interface LogAccessParams {
  type: AccessLogType
  ip?: string
  userId?: string | null
  userEmail?: string | null
  username?: string | null
  categoryId?: string | null
  categoryName?: string | null
  filePath?: string | null
  userAgent?: string | null
}

/**
 * Fire-and-forget access log write.
 * Never throws, never awaited on the hot path — logging must not slow down requests.
 */
export function logAccess(params: LogAccessParams): void {
  prisma.accessLog.create({
    data: {
      type: params.type,
      ip: params.ip ?? '',
      userId: params.userId ?? null,
      userEmail: params.userEmail ?? null,
      username: params.username ?? null,
      categoryId: params.categoryId ?? null,
      categoryName: params.categoryName ?? null,
      filePath: params.filePath ?? null,
      userAgent: params.userAgent ?? null,
    },
  }).catch((err) => console.error('[access-log]', err))
}
