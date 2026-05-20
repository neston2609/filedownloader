import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AccountForm } from '@/components/AccountForm'
import { membershipExpiry } from '@/lib/membership'
import { formatDate } from '@/lib/utils'
import { CalendarClock, Package } from 'lucide-react'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [user, groupAccess] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, email: true, username: true, role: true, paymentStatus: true,
        createdAt: true, membershipStart: true, membershipMonths: true,
      },
    }),
    prisma.userGroupAccess.findMany({
      where: { userId: session.user.id, granted: true },
      include: { group: { select: { name: true } } },
      orderBy: { expiresAt: 'asc' },
    }),
  ])

  if (!user) redirect('/login')

  const expiry = membershipExpiry(user)
  const now = Date.now()

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-ink mb-2">My Account</h1>
      <p className="text-mute mb-8">Update your password and review account details.</p>

      {/* My packages — each expires independently */}
      <div className="bg-paper border-[1.5px] border-ink rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-ink flex items-center gap-2"><Package className="w-4 h-4 text-retro-grape" /> My Packages</h2>
          <Link href="/subscribe" className="text-xs font-semibold text-ink underline">Subscribe / Renew</Link>
        </div>
        {groupAccess.length === 0 ? (
          <p className="text-sm text-mute">You don&apos;t have any active packages. Visit the Subscribe page to get access.</p>
        ) : (
          <div className="space-y-2">
            {groupAccess.map(g => {
              const exp = g.expiresAt ? g.expiresAt.getTime() : null
              const isExp = exp ? exp < now : false
              return (
                <div key={g.groupId} className="flex items-center justify-between gap-3 bg-bg2 border-[1.5px] border-ink rounded-lg px-3 py-2">
                  <span className="font-medium text-ink text-sm">{g.group?.name ?? 'Group'}</span>
                  <span className={`text-xs font-mono flex items-center gap-1 ${isExp ? 'text-retro-coral font-bold' : 'text-ink2'}`}>
                    <CalendarClock className="w-3.5 h-3.5" />
                    {g.expiresAt ? `${isExp ? 'EXPIRED ' : ''}${formatDate(g.expiresAt.toISOString())}` : 'Unlimited'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AccountForm user={{
        email: user.email,
        username: user.username,
        role: user.role,
        paymentStatus: user.paymentStatus,
        createdAt: user.createdAt.toISOString(),
        membershipStart: user.membershipStart ? user.membershipStart.toISOString() : null,
        membershipExpiry: expiry ? expiry.toISOString() : null,
        membershipMonths: user.membershipMonths,
      }} />
    </div>
  )
}
