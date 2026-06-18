import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [companiesRes, driversRes, loadsRes, factoringRes] = await Promise.all([
      supabaseAdmin.from('companies').select('plan, plan_status'),
      supabaseAdmin.from('drivers').select('id', { count: 'exact' }),
      supabaseAdmin.from('loads').select('id', { count: 'exact' }),
      supabaseAdmin.from('factoring_records').select('invoice_amount'),
    ])

    const companies = companiesRes.data || []
    const active = companies.filter(c => c.plan_status === 'active')
    const trial = companies.filter(c => c.plan_status === 'trial')
    const mrr = active.reduce((s, c) => s + (c.plan === 'enterprise' ? 399 : c.plan === 'pro' ? 199 : 99), 0)
    const totalFactored = (factoringRes.data || []).reduce((s, f) => s + parseFloat(f.invoice_amount || 0), 0)

    return NextResponse.json({
      total_companies: companies.length,
      active_companies: active.length,
      trial_companies: trial.length,
      total_drivers: driversRes.count || 0,
      total_loads: loadsRes.count || 0,
      total_factored: totalFactored,
      mrr,
      arr: mrr * 12,
    })
  } catch (err) {
    return NextResponse.json({ total_companies: 0, mrr: 0 })
  }
}
