import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PLAN_IDS = {
  starter: process.env.PAYPAL_PLAN_STARTER,
  pro: process.env.PAYPAL_PLAN_PRO,
  enterprise: process.env.PAYPAL_PLAN_ENTERPRISE,
}

async function getAccessToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

export async function POST(request) {
  try {
    const { company_id, plan, email, company_name } = await request.json()

    if (!company_id || !plan) {
      return NextResponse.json({ error: 'company_id and plan required' }, { status: 400 })
    }

    const planId = PLAN_IDS[plan]
    if (!planId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const accessToken = await getAccessToken()

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: {
          email_address: email,
          name: { given_name: company_name },
        },
        custom_id: company_id,
        application_context: {
          brand_name: 'TruckSuperSoftware',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: `${process.env.NEXT_PUBLIC_URL}/onboard/success?company_id=${company_id}`,
          cancel_url: `${process.env.NEXT_PUBLIC_URL}/signup?step=5&company_id=${company_id}`,
        },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('PayPal subscription error:', data)
      return NextResponse.json({ error: data.message || 'PayPal error' }, { status: 400 })
    }

    // Save subscription ID to company
    await supabaseAdmin.from('companies').update({
      subscription_id: data.id,
      plan,
    }).eq('id', company_id)

    const approveLink = data.links?.find(l => l.rel === 'approve')

    return NextResponse.json({ url: approveLink?.href, subscription_id: data.id })
  } catch (err) {
    console.error('PayPal create subscription error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
