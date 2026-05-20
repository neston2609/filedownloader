import { prisma } from '@/lib/prisma'
import { isMembershipExpired } from '@/lib/membership'

export type DenyReason = 'inactive' | 'expired' | 'hidden' | 'no-access'

export interface AccessResult {
  allowed: boolean
  reason?: DenyReason
}

export interface CategoryState {
  hasAccess: boolean
  hidden: boolean
}

/**
 * Resolve a user's access + hidden state for one category.
 *
 * Group path (category belongs to a group with a UserGroupAccess row) OVERRIDES
 * the per-category setting and has its OWN expiry (each package is independent
 * of the global membership and of other packages). A granted group with a
 * past expiresAt counts as no access.
 *
 * Per-category path (no group setting) uses the global membership window for
 * expiry — admins fetch the user separately and pass `membershipExpired`.
 */
export async function resolveCategoryState(
  userId: string,
  categoryId: string,
  membershipExpired = false
): Promise<CategoryState> {
  const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { groupId: true } })
  const groupId = cat?.groupId ?? null
  const now = Date.now()

  if (groupId) {
    const gs = await prisma.userGroupAccess.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (gs) {
      const notExpired = !gs.expiresAt || gs.expiresAt.getTime() > now
      return { hasAccess: gs.granted && notExpired, hidden: gs.hidden }
    }
  }

  const [hidden, access] = await Promise.all([
    prisma.userHiddenCategory.findUnique({ where: { userId_categoryId: { userId, categoryId } } }),
    prisma.userCategoryAccess.findUnique({ where: { userId_categoryId: { userId, categoryId } } }),
  ])
  // Per-category (admin-granted) access still respects the global membership window.
  return { hasAccess: !!access && !membershipExpired, hidden: !!hidden }
}

/**
 * Central access check for a member viewing/downloading a category.
 * Admins always pass. Group-tied access is gated by the package's own expiry;
 * per-category access is gated by the global membership window.
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

  const { hasAccess, hidden } = await resolveCategoryState(userId, categoryId, isMembershipExpired(user))
  if (hidden) return { allowed: false, reason: 'hidden' }
  if (!hasAccess) return { allowed: false, reason: 'no-access' }

  return { allowed: true }
}

/**
 * Lighter check for BROWSING (listing files). Members may enter and browse
 * any category that isn't hidden from them (group override applies).
 * Downloading/playing is gated separately by checkCategoryAccess.
 */
export async function checkCategoryBrowse(
  userId: string,
  categoryId: string,
  isAdmin: boolean
): Promise<AccessResult> {
  if (isAdmin) return { allowed: true }

  const { hidden } = await resolveCategoryState(userId, categoryId)
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
