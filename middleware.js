import { NextResponse } from 'next/server'

export async function middleware(req) {
  const { pathname } = req.nextUrl

  // Always allow Next internals and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icon')
  ) {
    return NextResponse.next()
  }

  // Allow login page
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.next()
  }

  // Check for admin auth via cookie/localStorage is client-side only
  // We rely on each page doing its own auth check
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/driver/:path*'],
}
