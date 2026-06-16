import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, clearLimit } from '@/lib/rate-limit'
import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { logAdminAction, ACTIONS } from '@/lib/audit'

function secret() {
  if (!process.env.ADMIN_JWT_SECRET) throw new Error('Missing ADMIN_JWT_SECRET')
  return new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
}

// Simple in-memory rate limiter (5 attempts per IP per 15 min)
const attempts = new Map()
function checkRateLimit(ip) {
  const now = Date.now()
  const window = 15 * 60 * 1000
  const max = 5
  const key = ip || 'unknown'
  const entry = attempts.get(key) || { count: 0, reset: now + window }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + window }
  entry.count++
  attempts.set(key, entry)
  return entry.count <= max
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 })
    }

    const { pin } = await request.json()
    if (!pin) return NextResponse.json({ error: 'PIN required' }, { status: 400 })

    const { data: admins, error } = await supabaseAdmin
      .from('admins')
      .select('id, name, role, status, pin')
      .eq('status', 'active')

    if (error) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const admin = admins?.find(a => a.pin === String(pin).trim())
    if (!admin) return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })

    const token = await new SignJWT({
      admin_id: admin.id,
      name: admin.name,
      role: admin.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret())

    const res = NextResponse.json({
      success: true,
      admin: { id: admin.id, name: admin.name, role: admin.role },
    })

    // HTTP-only cookie — JS cannot read this
    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 8,
    })

    await logAdminAction({
      admin_id: admin.id,
      admin_name: admin.name,
      action: ACTIONS.ADMIN_LOGIN,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      metadata: { role: admin.role },
    }).catch(() => {})
    return res
  } catch (err) {
    console.error('Admin auth error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin_token', '', { httpOnly: true, secure: true, maxAge: 0, path: '/' })
  return res
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('admins').select('id, name, role').eq('status', 'active').order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data || [])
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
