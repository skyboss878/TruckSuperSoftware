import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const start = Date.now()
  const checks = {}

  const tables = ['drivers','tickets','messages','maintenance','fuel_logs','timesheets','pre_trip_inspections','admins']
  for (const table of tables) {
    try {
      const { error } = await supabaseAdmin.from(table).select('id').limit(1)
      checks[table] = error ? 'fail' : 'ok'
    } catch { checks[table] = 'fail' }
  }

  const failing = Object.entries(checks).filter(([,v]) => v === 'fail').map(([k]) => k)
  const healthy = failing.length === 0
  const ms = Date.now() - start

  return NextResponse.json({
    status: healthy ? 'healthy' : 'degraded',
    checks,
    failing,
    response_ms: ms,
    timestamp: new Date().toISOString(),
    version: '2.0',
  }, { status: healthy ? 200 : 207 })
}
