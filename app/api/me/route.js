import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  return NextResponse.json({
    company: ctx.company,
    role: ctx.role,
    name: ctx.name,
  })
}
