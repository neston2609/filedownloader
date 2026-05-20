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
 * Resolve a user's access + hidden state for one category. A group-level
 * setting (UserGroupAccess) for the category's group OVERRIDES the
 * per-category setting. Categories with no group use per-category only.
 */
export async function resolveCategoryState(userId: string, categoryId: string): Promise<CategoryState> {
  const cat = await prisma.category.findUnique({ where: { id: categoryId }, select: { groupId: true } })
  const groupId = cat?.groupId ?? null

  if (groupId) {
    const gs = await prisma.userGroupAccess.findUnique({
      where: { userId_groupId: { userId, groupId } },
    })
    if (gs) return { hasAccess: gs.granted, hidden: gs.hidden }
  }

  const [hidden, access] = await Promise.all([
    prisma.userHiddenCategory.findUnique({ where: { userId_categoryId: { userId, categoryId } } }),
    prisma.userCategoryAccess.findUnique({ where: { userId_categoryId: { userId, categoryId } } }),
  ])
  return { hasAccess: !!access, hidden: !!hidden }
}

/**
 * Central access check for a member viewing/downloading a category.
 * Admins always pass. Members must be: active, not expired, the category
 * not hidden for them, and granted access (per-category or via group).
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

  const { hasAccess, hidden } = await resolveCategoryState(userId, categoryId)
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
