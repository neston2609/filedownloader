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

// Preset membership lengths offered in the admin UI
export const MEMBERSHIP_PRESETS: { label: string; months: number | null }[] = [
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: 'Unlimited', months: null },
]
