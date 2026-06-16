import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Quick DB ping
    const { error } = await supabaseAdmin.from('drivers').select('id').limit(1)
    return NextResponse.json({
      status: error ? 'degraded' : 'healthy',
      service: 'cron',
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ status: 'error', service: 'cron', timestamp: new Date().toISOString() }, { status: 500 })
  }
}
