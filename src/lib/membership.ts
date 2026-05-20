// Membership window helpers. A user's access expires `membershipMonths`
// after `membershipStart`. If either is null, the membership is treated as
// unlimited (never expires).

export interface MembershipFields {
  membershipStart: Date | string | null
  membershipMonths: number | null
}

export function membershipExpiry(user: MembershipFields): Date | null {
  if (!user.membershipStart || user.membershipMonths == null) return null
  const start = new Date(user.membershipStart)
  const expiry = new Date(start)
  expiry.setMonth(expiry.getMonth() + user.membershipMonths)
  return expiry
}

export function isMembershipExpired(user: MembershipFields, now: Date = new Date()): boolean {
  const expiry = membershipExpiry(user)
  if (!expiry) return false // unlimited
  return now.getTime() > expiry.getTime()
}

export function daysUntilExpiry(user: MembershipFields, now: Date = new Date()): number | null {
  const expiry = membershipExpiry(user)
  if (!expiry) return null
  const ms = expiry.getTime() - now.getTime()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

// Compute the new expiry when extending by `months`. If the member is
// currently expired (or has no membership), count from today; otherwise
// count from their current expiry date.
export function computeExtendedExpiry(user: MembershipFields, months: number, now: Date = new Date()): Date {
  const current = membershipExpiry(user)
  const base = !current || isMembershipExpired(user, now) ? now : current
  return addMonths(base, months)
}

// Given the current membership and a number of months to add, return the new
// {membershipStart, membershipMonths} pair. Keeps the original start when
// still active (so the day-of-month is preserved); resets to `now` when
// expired.
export function applyExtension(
  user: MembershipFields,
  months: number,
  now: Date = new Date()
): { membershipStart: Date; membershipMonths: number } {
  const current = membershipExpiry(user)
  const expired = !current || isMembershipExpired(user, now) || !user.membershipStart || user.membershipMonths == null
  if (expired) {
    return { membershipStart: now, membershipMonths: months }
  }
  return {
    membershipStart: new Date(user.membershipStart!),
    membershipMonths: (user.membershipMonths ?? 0) + months,
  }
}

// Preset membership lengths offered in the admin UI
export const MEMBERSHIP_PRESETS: { label: string; months: number | null }[] = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: 'Unlimited', months: null },
]
