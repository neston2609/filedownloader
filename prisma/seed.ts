import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@1234', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@securefiles.local' },
    update: {},
    create: {
      email: 'admin@securefiles.local',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
      paymentStatus: 'paid',
    },
  })
  console.log('Admin user:', admin.email)

  // Create default affiliate settings
  const existing = await prisma.affiliateSettings.findFirst()
  if (!existing) {
    await prisma.affiliateSettings.create({ data: { globalLink: '' } })
    console.log('Affiliate settings initialized')
  }

  console.log('Seed complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
