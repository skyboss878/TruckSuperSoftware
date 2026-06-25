import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAuthContext } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
}

export async function POST(request) {
  const ctx = await getAuthContext(request)
  if (ctx.error) return ctx.error

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    const { plan } = await request.json()
    const priceId = PRICE_IDS[plan]
    if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { company_id: ctx.company_id, plan },
        trial_period_days: 14,
      },
      customer_email: ctx.company?.email,
      success_url: `${process.env.NEXT_PUBLIC_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/billing?cancelled=true`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
