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

  // Protect admin routes with JWT cookie
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('admin_token')?.value
    if (!token) return NextResponse.redirect(new URL('/login', req.url))
    try {
      await jwtVerify(token, secret())
      return NextResponse.next()
    } catch {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Driver routes — Supabase handles their auth client-side
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/driver/:path*'],
}
