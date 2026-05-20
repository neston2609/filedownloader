import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { membershipExpiry, isMembershipExpired } from '@/lib/membership'
import { getSiteSettings } from '@/lib/settings'
import { SubscribeClient } from '@/components/SubscribeClient'

export default async function SubscribePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, plans, settings, requests] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { membershipStart: true, membershipMonths: true },
    }),
    prisma.membershipPlan.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { months: 'asc' }],
      include: { group: { select: { name: true } } },
    }),
    getSiteSettings(),
    prisma.subscriptionRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const expiry = user ? membershipExpiry(user) : null
  const expired = user ? isMembershipExpired(user) : false

  const qrUrl = settings.paymentQrUrl && settings.paymentQrUrl.startsWith('/uploads/')
    ? `/api${settings.paymentQrUrl}`
    : settings.paymentQrUrl

  return (
    <SubscribeClient
      plans={plans.map(p => ({ id: p.id, name: p.name, months: p.months, priceThb: p.priceThb, groupName: p.group?.name ?? null }))}
      currentExpiry={expiry ? expiry.toISOString() : null}
      expired={expired}
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
