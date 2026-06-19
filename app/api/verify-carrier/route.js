import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// FMCSA public API — free, no key required for basic lookups
const FMCSA_BASE = 'https://safer.fmcsa.dot.gov/query.asp'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dot = searchParams.get('dot')
    const mc = searchParams.get('mc')

    if (!dot && !mc) {
      return NextResponse.json({ error: 'DOT or MC number required' }, { status: 400 })
    }

    // Check if we have cached verification
    let query = supabaseAdmin.from('carrier_profiles').select('*')
    if (dot) query = query.eq('dot_number', dot)
    else query = query.eq('mc_number', mc)
    
    const { data: cached } = await query.single()
    
    // Return cached if verified within 30 days
    if (cached?.last_verified_at) {
      const daysSince = (Date.now() - new Date(cached.last_verified_at)) / (1000 * 60 * 60 * 24)
      if (daysSince < 30) return NextResponse.json({ ...cached, source: 'cache' })
    }

    // Hit FMCSA API
    const searchType = dot ? 'USDOT' : 'MC_MX'
    const searchVal = dot || mc
    const fmcsaKey = process.env.FMCSA_API_KEY
    if (!fmcsaKey) {
      console.warn('[FMCSA] FMCSA_API_KEY env var is missing — falling back to demo key. Carrier verification will likely fail or return limited data.')
    }
    const url = `https://mobile.fmcsa.dot.gov/qc/services/carriers/${dot ? dot : 'docket/'+mc}?webKey=${fmcsaKey || 'demo'}`
    
    let fmcsaData = null
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (res.ok) fmcsaData = await res.json()
    } catch {}

    // Build verified profile from FMCSA data or manual entry
    const carrier = fmcsaData?.content?.carrier || {}
    const profile = {
      dot_number: dot || carrier.dotNumber,
      mc_number: mc || carrier.mcNumber,
      company_name: carrier.legalName || carrier.dbaName || 'Unknown',
      safety_rating: carrier.safetyRating || 'not_rated',
      authority_status: carrier.allowedToOperate === 'Y' ? 'active' : 'inactive',
      insurance_status: carrier.bipdInsuranceOnFile === 'Y' ? 'on_file' : 'not_on_file',
      total_trucks: parseInt(carrier.totalPowerUnits) || 0,
      total_drivers: parseInt(carrier.totalDrivers) || 0,
      verified: true,
      verified_at: new Date().toISOString(),
      last_verified_at: new Date().toISOString(),
      fmcsa_data: fmcsaData
    }

    // Upsert into our DB
    const { data: saved } = await supabaseAdmin
      .from('carrier_profiles')
      .upsert(profile, { onConflict: 'dot_number' })
      .select().single()

    return NextResponse.json({ ...(saved || profile), source: 'fmcsa' })
  } catch (err) {
    console.error('FMCSA verify error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
