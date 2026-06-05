import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: drivers }, { data: tickets }, { data: maintenance }, { data: pretrip }] = await Promise.all([
      supabaseAdmin.from('drivers').select('id, name, status, truck_number'),
      supabaseAdmin.from('tickets').select('driver_id, status, created_at').gte('created_at', since),
      supabaseAdmin.from('maintenance').select('driver_id, severity, status, created_at').gte('created_at', since),
      supabaseAdmin.from('pre_trip_inspections').select('driver_id, passed, created_at').gte('created_at', since),
    ])

    const scores = (drivers || []).map(driver => {
      const dTickets = (tickets || []).filter(t => t.driver_id === driver.id)
      const dMaint = (maintenance || []).filter(m => m.driver_id === driver.id)
      const dPretrip = (pretrip || []).filter(p => p.driver_id === driver.id)

      let safetyScore = 100
      dMaint.forEach(m => {
        if (m.severity === 'high') safetyScore -= 15
        else if (m.severity === 'medium') safetyScore -= 7
        else safetyScore -= 2
      })
      safetyScore -= dPretrip.filter(p => !p.passed).length * 10
      safetyScore = Math.max(0, Math.min(100, safetyScore))

      const totalPretrips = dPretrip.length
      const passedPretrips = dPretrip.filter(p => p.passed).length
      const complianceScore = totalPretrips > 0 ? Math.round((passedPretrips / totalPretrips) * 100) : 100

      const totalTickets = dTickets.length
      const approvedTickets = dTickets.filter(t => t.status === 'approved').length
      const productivityScore = totalTickets > 0 ? Math.round((approvedTickets / totalTickets) * 100) : 100

      const overall = Math.round((safetyScore + complianceScore + productivityScore) / 3)
      const grade = overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F'

      return {
        driver: { id: driver.id, name: driver.name, status: driver.status, truck: driver.truck_number },
        safety: { score: safetyScore, grade: safetyScore >= 90 ? 'A' : safetyScore >= 80 ? 'B' : safetyScore >= 70 ? 'C' : 'D' },
        compliance: { score: complianceScore, pretrips: totalPretrips, passed: passedPretrips },
        productivity: { score: productivityScore, tickets: totalTickets, approved: approvedTickets },
        maintenance: { total: dMaint.length, high: dMaint.filter(m => m.severity === 'high').length },
        overall,
        grade,
      }
    })

    scores.sort((a, b) => b.overall - a.overall)
    return NextResponse.json(scores)
  } catch (err) {
    console.error('Scorecard error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
