import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { type, data } = event

  try {
    switch (type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = data.object
        const company_id = sub.metadata?.company_id
        if (company_id) {
          const plan = sub.metadata?.plan || 'pro'
          const status = sub.status === 'active' ? 'active' : 'trial'
          await supabaseAdmin.from('companies').update({
            plan_status: status,
            subscription_id: sub.id,
            onboarded: true,
            onboarded_at: new Date().toISOString(),
          }).eq('id', company_id)
          await supabaseAdmin.from('billing_events').insert({
            company_id, event_type: 'subscription_created',
            description: `Stripe subscription ${type} — ${plan}`,
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = data.object
        const company_id = sub.metadata?.company_id
        if (company_id) {
          await supabaseAdmin.from('companies').update({ plan_status: 'cancelled' }).eq('id', company_id)
          await supabaseAdmin.from('billing_events').insert({
            company_id, event_type: 'cancelled', description: 'Stripe subscription cancelled',
          })
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const inv = data.object
        const company_id = inv.subscription_details?.metadata?.company_id
        if (company_id) {
          await supabaseAdmin.from('companies').update({ plan_status: 'active' }).eq('id', company_id)
          await supabaseAdmin.from('billing_events').insert({
            company_id, event_type: 'payment_succeeded',
            amount: inv.amount_paid / 100,
            description: `Payment received $${(inv.amount_paid / 100).toFixed(2)}`,
          })
        }
        break
      }
      case 'invoice.payment_failed': {
        const inv = data.object
        const company_id = inv.subscription_details?.metadata?.company_id
        if (company_id) {
          await supabaseAdmin.from('companies').update({ plan_status: 'past_due' }).eq('id', company_id)
          await supabaseAdmin.from('billing_events').insert({
            company_id, event_type: 'payment_failed', description: 'Stripe payment failed',
          })
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}
