import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logAccess } from '@/lib/access-log'

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null

        const identifier = (credentials.email as string).trim()
        if (!identifier) return null

        // Accept either email (case-insensitive) or username (case-sensitive)
        const looksLikeEmail = identifier.includes('@')
        const user = await prisma.user.findFirst({
          where: looksLikeEmail
            ? { email: { equals: identifier, mode: 'insensitive' } }
            : { username: identifier },
        })

        if (!user) return null
        if (!user.emailVerified) throw new Error('Please confirm your email first. Check your inbox for the confirmation link.')
        if (!user.isActive) throw new Error('Account pending admin approval')

        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null

        // Log successful login (fire-and-forget)
        const ip =
          request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          request?.headers?.get('x-real-ip') ||
          ''
        logAccess({
          type: 'LOGIN',
          ip,
          userId: user.id,
          userEmail: user.email,
          username: user.username,
          userAgent: request?.headers?.get('user-agent') ?? undefined,
        })

        return {
          id: user.id,
          email: user.email,
          name: user.username,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
})
