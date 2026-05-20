import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { membershipExpiry, isMembershipExpired } from '@/lib/membership'
import { getSiteSettings } from '@/lib/settings'
import { SubscribeClient } from '@/components/SubscribeClient'

export default async function SubscribePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, plans, settings, requests, groupAccess] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { membershipStart: true, membershipMonths: true },
    }),
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { months: 'asc' }],
      include: { group: { select: { id: true, name: true, description: true, sortOrder: true } } },
    }),
    getSiteSettings(),
    prisma.subscriptionRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.userGroupAccess.findMany({
      where: { userId: session.user.id, granted: true },
      include: { group: { select: { id: true, name: true } } },
    }),
  ])

  const expiry = user ? membershipExpiry(user) : null
  const expired = user ? isMembershipExpired(user) : false

  // Per-package (group) expiry map for the client
  const groupExpiry: Record<string, string | null> = {}
  const myPackages = groupAccess.map((g) => {
    groupExpiry[g.groupId] = g.expiresAt ? g.expiresAt.toISOString() : null
    return {
      groupId: g.groupId,
      groupName: g.group?.name ?? 'Group',
      expiresAt: g.expiresAt ? g.expiresAt.toISOString() : null,
    }
  })

  const qrUrl = settings.paymentQrUrl && settings.paymentQrUrl.startsWith('/uploads/')
    ? `/api${settings.paymentQrUrl}`
    : settings.paymentQrUrl

  return (
    <SubscribeClient
      plans={plans.map(p => ({
        id: p.id, name: p.name, months: p.months, priceThb: p.priceThb,
        groupId: p.group?.id ?? null,
        groupName: p.group?.name ?? null,
        groupDescription: p.group?.description ?? null,
        groupSortOrder: p.group?.sortOrder ?? 9999,
      }))}
      currentExpiry={expiry ? expiry.toISOString() : null}
      expired={expired}
      groupExpiry={groupExpiry}
      myPackages={myPackages}
      bankAccount={settings.bankAccount}
      paymentQrUrl={qrUrl ?? null}
      contactEmail={settings.contactEmail}
      initialRequests={requests.map(r => ({
        id: r.id,
        planName: r.planName,
        months: r.months,
        priceThb: r.priceThb,
        status: r.status,
        slipUrl: r.slipUrl && r.slipUrl.startsWith('/uploads/') ? `/api${r.slipUrl}` : r.slipUrl,
        previousExpiry: r.previousExpiry ? r.previousExpiry.toISOString() : null,
        newExpiry: r.newExpiry ? r.newExpiry.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  )
}
