import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth-helpers'

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error
  try {
    const body = await request.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01', // model: claude-sonnet-4-6 (set by caller)
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-6',
        ...body,
      }),
    })
    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'AI error' }, { status: 500 })
  }
}
