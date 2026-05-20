// middleware.ts
import { withAuth } from 'next-auth/middleware'

export default withAuth({ pages: { signIn: '/admin' } })

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/admin/requests/:path*',
    '/admin/equipment/:path*',
    '/admin/history/:path*',
  ],
}
