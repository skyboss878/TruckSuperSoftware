import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// 2024 IFTA diesel tax rates ($ per gallon)
const IFTA_RATES = {
  AL:0.280, AZ:0.260, AR:0.285, CA:0.824, CO:0.205,
  CT:0.494, DE:0.220, FL:0.348, GA:0.326, ID:0.320,
  IL:0.467, IN:0.530, IA:0.325, KS:0.260, KY:0.246,
  LA:0.200, ME:0.312, MD:0.365, MA:0.240, MI:0.263,
  MN:0.285, MS:0.180, MO:0.170, MT:0.278, NE:0.246,
  NV:0.270, NH:0.222, NJ:0.418, NM:0.210, NY:0.462,
  NC:0.363, ND:0.230, OH:0.470, OK:0.160, OR:0.390,
  PA:0.741, RI:0.340, SC:0.220, SD:0.280, TN:0.270,
  TX:0.200, UT:0.319, VT:0.320, VA:0.278, WA:0.494,
  WV:0.357, WI:0.329, WY:0.240,
  // Canadian provinces
  AB:0.130, BC:0.193, MB:0.140, ON:0.143, QC:0.202, SK:0.150,
}

function getQuarterRange(quarter, year) {
  const ranges = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  }
  return ranges[quarter]
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const quarter = parseInt(searchParams.get('quarter') || '1')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())
    const driver_id = searchParams.get('driver_id')

    const [startDate, endDate] = getQuarterRange(quarter, year)

    // 1. Pull all drive_sessions in the quarter
    let sessionsQuery = supabaseAdmin
      .from('drive_sessions')
      .select('driver_id, state_miles, total_miles, started_at, drivers(name, truck_number)')
      .gte('started_at', startDate)
      .lte('started_at', endDate + 'T23:59:59')
      .eq('status', 'ended')

    if (driver_id) sessionsQuery = sessionsQuery.eq('driver_id', driver_id)

    const { data: sessions, error: sessErr } = await sessionsQuery
    if (sessErr) return NextResponse.json({ error: sessErr.message }, { status: 400 })

    // 2. Pull all fuel logs in the quarter
    let fuelQuery = supabaseAdmin
      .from('fuel_logs')
      .select('driver_id, date, state, gallons, total_cost, drivers(name)')
      .gte('date', startDate)
      .lte('date', endDate)

    if (driver_id) fuelQuery = fuelQuery.eq('driver_id', driver_id)

    const { data: fuelLogs, error: fuelErr } = await fuelQuery
    if (fuelErr) return NextResponse.json({ error: fuelErr.message }, { status: 400 })

    // 3. Aggregate miles per state
    const stateMiles = {}
    let totalMiles = 0
    for (const session of sessions || []) {
      for (const entry of session.state_miles || []) {
        const s = entry.state?.toUpperCase()
        if (!s || s === 'UNKNOWN') continue
        stateMiles[s] = (stateMiles[s] || 0) + (entry.miles || 0)
        totalMiles += entry.miles || 0
      }
    }

    // 4. Aggregate fuel per state
    const stateFuel = {}
    let totalGallons = 0
    let totalFuelCost = 0
    for (const log of fuelLogs || []) {
      const s = log.state?.toUpperCase()
      if (s) {
        stateFuel[s] = (stateFuel[s] || 0) + (log.gallons || 0)
      }
      totalGallons += log.gallons || 0
      totalFuelCost += log.total_cost || 0
    }

    // 5. Fleet average MPG
    const fleet = {
      totalMiles: parseFloat(totalMiles.toFixed(2)),
      totalGallons: parseFloat(totalGallons.toFixed(3)),
      totalFuelCost: parseFloat(totalFuelCost.toFixed(2)),
      avgMPG: totalGallons > 0 ? parseFloat((totalMiles / totalGallons).toFixed(2)) : 0,
      statesOperated: stateReport.length,
      totalTaxOwed: parseFloat(totalTaxOwed.toFixed(2)),
      sessions: sessions?.length || 0,
      fuelStops: fuelLogs?.length || 0,
    }

    return NextResponse.json({
      fleet,
      states: stateReport,
    })
  } catch (err) {
    console.error('IFTA error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
