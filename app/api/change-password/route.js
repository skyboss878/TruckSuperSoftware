import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const { new_password } = await request.json()
    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Update password in Supabase auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      ctx.user.id,
      { password: new_password }
    )
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    // Clear the must_change_password flag
    await supabaseAdmin.from('drivers')
      .update({ must_change_password: false })
      .eq('auth_id', ctx.user.id)
      .eq('company_id', ctx.company_id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
