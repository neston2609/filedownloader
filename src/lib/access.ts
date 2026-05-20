import { prisma } from '@/lib/prisma'
import { isMembershipExpired } from '@/lib/membership'

export type DenyReason = 'inactive' | 'expired' | 'hidden' | 'no-access'

export interface AccessResult {
  allowed: boolean
  reason?: DenyReason
}

/**
 * Central access check for a member viewing/downloading a category.
 * Admins always pass. Members must be: active, not expired, the category
 * not hidden for them, and explicitly granted access.
 */
export async function checkCategoryAccess(
  userId: string,
  categoryId: string,
  isAdmin: boolean
): Promise<AccessResult> {
  if (isAdmin) return { allowed: true }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true, membershipStart: true, membershipMonths: true },
  })
  if (!user || !user.isActive) return { allowed: false, reason: 'inactive' }
  if (isMembershipExpired(user)) return { allowed: false, reason: 'expired' }

  const [hidden, access] = await Promise.all([
    prisma.userHiddenCategory.findUnique({
      where: { userId_categoryId: { userId, categoryId } },
    }),
    prisma.userCategoryAccess.findUnique({
      where: { userId_categoryId: { userId, categoryId } },
    }),
  ])
  if (hidden) return { allowed: false, reason: 'hidden' }
  if (!access) return { allowed: false, reason: 'no-access' }

  return { allowed: true }
}

/**
 * Lighter check for BROWSING (listing files). Members may now enter and
 * browse any category that isn't hidden from them — downloading/playing is
 * gated separately by checkCategoryAccess. Admins always pass.
 */
export async function checkCategoryBrowse(
  userId: string,
  categoryId: string,
  isAdmin: boolean
): Promise<AccessResult> {
  if (isAdmin) return { allowed: true }

  const hidden = await prisma.userHiddenCategory.findUnique({
    where: { userId_categoryId: { userId, categoryId } },
  })
  if (hidden) return { allowed: false, reason: 'hidden' }

  return { allowed: true }
}

const STATUS_BY_REASON: Record<DenyReason, number> = {
  inactive: 403,
  expired: 403,
  hidden: 404,
  'no-access': 403,
}

const MESSAGE_BY_REASON: Record<DenyReason, string> = {
  inactive: 'Your account is not active.',
  expired: 'Your membership has expired. Please contact the administrator to renew.',
  hidden: 'Category not found.',
  'no-access': 'You do not have access to this category.',
}

export function accessDenyResponse(reason: DenyReason) {
  return {
    status: STATUS_BY_REASON[reason],
    body: { error: MESSAGE_BY_REASON[reason], reason },
  }
}
