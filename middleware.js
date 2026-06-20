import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function secret() {
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
}

export async function middleware(req) {
  const { pathname } = req.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/manifest')
  ) return NextResponse.next()

  if (pathname === '/login' || pathname === '/') return NextResponse.next()

  // Admin and driver routes — multi-tenant auth is handled client-side via Supabase session + company_id in localStorage
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/driver/:path*'],
}
