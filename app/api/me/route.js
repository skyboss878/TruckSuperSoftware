import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('company_users')
      .select('*, companies(*)')
      .eq('user_id', user_id)
      .single()

    if (error || !data) return NextResponse.json({ company: null, role: null })

    return NextResponse.json({
      company: data.companies,
      role: data.role,
      name: data.name,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
