import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const sinceDate = since.split('T')[0]

    const [
      { data: drivers },
      { data: tickets },
      { data: maintenance },
      { data: pretrip },
      { data: timesheets },
    ] = await Promise.all([
      supabaseAdmin.from('drivers').select('id, name, status, truck_number'),
      supabaseAdmin.from('tickets').select('driver_id, status, created_at, boxes').gte('created_at', since),
      supabaseAdmin.from('maintenance').select('driver_id, severity, status, created_at').gte('created_at', since),
      supabaseAdmin.from('pre_trip_inspections').select('driver_id, defects_found, overall_status, items, inspection_date').gte('inspection_date', sinceDate),
      supabaseAdmin.from('timesheets').select('driver_id, start_time, end_time, state_miles, log_type, date').gte('date', sinceDate),
    ])

    const scores = (drivers || []).map(driver => {
      const dTickets = (tickets || []).filter(t => t.driver_id === driver.id)
      const dMaint = (maintenance || []).filter(m => m.driver_id === driver.id)
      const dPretrip = (pretrip || []).filter(p => p.driver_id === driver.id)
      const dSheets = (timesheets || []).filter(t => t.driver_id === driver.id)

      // ── MILES ──────────────────────────────────────────
      const totalMiles = dSheets.reduce((sum, ts) =>
        sum + (ts.state_miles?.reduce((s, m) => s + (parseInt(m.miles) || 0), 0) || 0), 0)
      const trips = dSheets.filter(ts => ts.log_type === 'working').length

      // ── HOS violations: shifts > 11 hours driving ──────
      let hosViolations = 0
      dSheets.forEach(ts => {
        if (ts.start_time && ts.end_time) {
          const [sh, sm] = ts.start_time.split(':').map(Number)
          const [eh, em] = ts.end_time.split(':').map(Number)
          const hours = (eh * 60 + em - (sh * 60 + sm)) / 60
          if (hours > 11) hosViolations++
        }
      })

      // ── SAFETY SCORE ───────────────────────────────────
      let safetyScore = 100
      dMaint.forEach(m => {
        if (m.severity === 'high') safetyScore -= 15
        else if (m.severity === 'medium') safetyScore -= 7
        else safetyScore -= 2
      })
      safetyScore -= hosViolations * 10
      const failedPretrips = dPretrip.filter(p => p.defects_found || p.overall_status === 'fail').length
      safetyScore -= failedPretrips * 8
      safetyScore = Math.max(0, Math.min(100, safetyScore))

      // ── PRE-TRIP ───────────────────────────────────────
      const pretripCompleted = dPretrip.length
      const pretripDefects = dPretrip.filter(p => p.defects_found).length
      const defectRate = pretripCompleted > 0
        ? Math.round((pretripDefects / pretripCompleted) * 100)
        : 0

      // ── COMPLIANCE SCORE ───────────────────────────────
      const passedPretrips = dPretrip.filter(p => !p.defects_found && p.overall_status !== 'fail').length
      const complianceScore = pretripCompleted > 0
        ? Math.round((passedPretrips / pretripCompleted) * 100)
        : 100

      // ── PRODUCTIVITY SCORE ─────────────────────────────
      const totalTickets = dTickets.length
      const approvedTickets = dTickets.filter(t => t.status === 'approved').length
      const approvalRate = totalTickets > 0
        ? Math.round((approvedTickets / totalTickets) * 100)
        : 100
      const totalBoxes = dTickets.reduce((s, t) =>
        s + (t.boxes?.length || 0), 0)

      // ── OVERALL ────────────────────────────────────────
      const overall = Math.round((safetyScore + complianceScore + approvalRate) / 3)
      const grade = overall >= 90 ? 'A' : overall >= 80 ? 'B' : overall >= 70 ? 'C' : overall >= 60 ? 'D' : 'F'
      const safetyGrade = safetyScore >= 90 ? 'A' : safetyScore >= 80 ? 'B' : safetyScore >= 70 ? 'C' : safetyScore >= 60 ? 'D' : 'F'

      return {
        driver: {
          id: driver.id,
          name: driver.name,
          status: driver.status,
          truck: driver.truck_number,
        },
        miles: {
          total: totalMiles,
          trips,
        },
        safety: {
          score: safetyScore,
          grade: safetyGrade,
          hos_violations: hosViolations,
          maintenance_reported: dMaint.length,
          high_severity: dMaint.filter(m => m.severity === 'high').length,
        },
        pretrip: {
          completed: pretripCompleted,
          defects: pretripDefects,
          defect_rate: defectRate,
          passed: passedPretrips,
        },
        compliance: {
          score: complianceScore,
        },
        tickets: {
          total: totalTickets,
          approved: approvedTickets,
          on_time_rate: approvalRate,
          boxes: totalBoxes,
        },
        productivity: {
          score: approvalRate,
        },
        maintenance: {
          total: dMaint.length,
          high: dMaint.filter(m => m.severity === 'high').length,
        },
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
