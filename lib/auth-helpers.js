import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// Verifies the real Supabase session token and resolves the caller's
// company + role server-side. Never trust a client-supplied user_id/company_id.
export async function getAuthContext(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return { error: NextResponse.json({ error: 'Missing auth token' }, { status: 401 }) }
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    return { error: NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 }) }
  }

  const user = userData.user

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('company_users')
    .select('*, companies(*)')
    .eq('user_id', user.id)
    .single()

  if (membershipError || !membership) {
    return { error: NextResponse.json({ error: 'No company account found' }, { status: 403 }) }
  }

  return {
    user,
    company_id: membership.company_id,
    role: membership.role,
    name: membership.name,
    company: membership.companies,
  }
}

export function requireRole(ctx, allowedRoles) {
  if (!ctx.role || !allowedRoles.includes(ctx.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function requireSuperAdmin(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return { error: ctx.error }
  if (ctx.role !== 'superadmin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return ctx
}
