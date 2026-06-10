import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function secureHandler(request, handler, roles = []) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (roles.length && !roles.includes(admin.role)) {
    return NextResponse.json({ error: 'Forbidden — insufficient role' }, { status: 403 })
  }
  return handler(admin)
}
