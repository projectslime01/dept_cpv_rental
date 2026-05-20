// src/lib/auth.ts
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null
        const admin = await prisma.admin.findUnique({
          where: { username: credentials.username },
        })
        if (!admin) return null
        const valid = await verifyPassword(credentials.password, admin.passwordHash)
        if (!valid) return null
        return { id: String(admin.id), name: admin.username }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/admin' },
  secret: process.env.NEXTAUTH_SECRET,
}
