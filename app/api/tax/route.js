import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear())

    const [expRes, revRes, perDiemRes] = await Promise.all([
      supabaseAdmin.from('expenses').select('*').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      supabaseAdmin.from('revenue_records').select('*').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`),
      supabaseAdmin.from('per_diem_records').select('*').eq('year', year)
    ])

    const expenses = expRes.data || []
    const revenue = revRes.data || []
    const perDiem = perDiemRes.data || []

    const totalRevenue = revenue.reduce((s, r) => s + parseFloat(r.amount || 0), 0)
    const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0)

    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0)
      return acc
    }, {})

    const perDiemTotal = perDiem.reduce((s, p) => s + parseFloat(p.amount || (p.days_away * p.rate_per_day) || 0), 0)
    const totalDeductions = totalExpenses + perDiemTotal
    const taxableIncome = Math.max(0, totalRevenue - totalDeductions)
    const estimatedTax = taxableIncome * 0.25

    return NextResponse.json({
      year,
      period: `${year} Annual`,
      totalRevenue,
      totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
      deductions: {
        fuel: byCategory['fuel'] || 0,
        maintenance: byCategory['maintenance'] || 0,
        insurance: byCategory['insurance'] || 0,
        permits: byCategory['permits'] || 0,
        eld: byCategory['eld'] || 0,
        tires: byCategory['tires'] || 0,
        tolls: byCategory['tolls'] || 0,
        per_diem: perDiemTotal,
        other: (byCategory['other'] || 0) + (byCategory['lodging'] || 0) + (byCategory['meals'] || 0) + (byCategory['phone'] || 0),
      },
      totalDeductions,
      taxableIncome,
      estimatedTax,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { action, summary } = await request.json()
    if (action !== 'ai_advice') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a trucking tax expert CPA. Analyze this carrier's ${summary.period} financials and give 3 specific tax-saving recommendations.

Revenue: $${summary.totalRevenue?.toFixed(2)}
Expenses: $${summary.totalExpenses?.toFixed(2)}
Per Diem: $${summary.deductions?.per_diem?.toFixed(2)}
Fuel: $${summary.deductions?.fuel?.toFixed(2)}
Maintenance: $${summary.deductions?.maintenance?.toFixed(2)}
Taxable Income: $${summary.taxableIncome?.toFixed(2)}
Estimated Tax: $${summary.estimatedTax?.toFixed(2)}

Give 3 specific trucking tax tips. Mention per diem if under-claiming, Section 179, IFTA credits. 2 sentences max per tip.`
      }]
    })

    return NextResponse.json({ advice: response.content[0].text })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
