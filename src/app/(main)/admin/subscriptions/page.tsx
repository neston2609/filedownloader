import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AdminSubscriptions } from '@/components/AdminSubscriptions'

export default async function AdminSubscriptionsPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') redirect('/download')

  const requests = await prisma.subscriptionRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, username: true, email: true } } },
  })

  return (
    <AdminSubscriptions
      initial={requests.map(r => ({
        id: r.id,
        username: r.user?.username ?? '(deleted)',
        email: r.user?.email ?? '',
        planName: r.planName,
        months: r.months,
        priceThb: r.priceThb,
        status: r.status,
        slipUrl: r.slipUrl && r.slipUrl.startsWith('/uploads/') ? `/api${r.slipUrl}` : r.slipUrl,
        previousExpiry: r.previousExpiry ? r.previousExpiry.toISOString() : null,
        newExpiry: r.newExpiry ? r.newExpiry.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      }))}
    />
  )
}
