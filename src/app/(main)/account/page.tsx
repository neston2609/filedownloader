import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AccountForm } from '@/components/AccountForm'

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, username: true, role: true, paymentStatus: true, createdAt: true },
  })

  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-slate-100 mb-2">My Account</h1>
      <p className="text-slate-400 mb-8">Update your password and review account details.</p>

      <AccountForm user={{
        email: user.email,
        username: user.username,
        role: user.role,
        paymentStatus: user.paymentStatus,
        createdAt: user.createdAt.toISOString(),
      }} />
    </div>
  )
}
