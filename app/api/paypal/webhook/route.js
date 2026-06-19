import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const event = await request.json()
    const { event_type, resource } = event

    const company_id = resource?.custom_id

    switch (event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        if (company_id) {
          await supabaseAdmin.from('companies').update({
            plan_status: 'active',
            onboarded: true,
            onboarded_at: new Date().toISOString(),
          }).eq('id', company_id)

          await supabaseAdmin.from('billing_events').insert({
            company_id,
            event_type: 'subscription_created',
            description: 'PayPal subscription activated',
          })
        }
        break
      }

      case 'PAYMENT.SALE.COMPLETED': {
        const subId = resource?.billing_agreement_id
        if (subId) {
          const { data: company } = await supabaseAdmin
            .from('companies').select('id').eq('subscription_id', subId).single()
          if (company) {
            await supabaseAdmin.from('companies').update({ plan_status: 'active' }).eq('id', company.id)
            await supabaseAdmin.from('billing_events').insert({
              company_id: company.id,
              event_type: 'payment_succeeded',
              amount: parseFloat(resource.amount?.total || 0),
              description: `PayPal payment received`,
            })
          }
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        if (company_id) {
          await supabaseAdmin.from('companies').update({ plan_status: 'cancelled' }).eq('id', company_id)
          await supabaseAdmin.from('billing_events').insert({
            company_id, event_type: 'cancelled', description: 'Subscription cancelled',
          })
        }
        break
      }

      case 'BILLING.SUBSCRIPTION.SUSPENDED':
      case 'PAYMENT.SALE.DENIED': {
        if (company_id) {
          await supabaseAdmin.from('companies').update({ plan_status: 'past_due' }).eq('id', company_id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('PayPal webhook error:', err)
    return NextResponse.json({ received: true })
  }
}
