import { NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request) {
  const admin = await verifyAdmin(request)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({
    id: admin.admin_id,
    name: admin.name,
    role: admin.role,
  })
}
