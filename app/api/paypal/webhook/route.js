import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

const PAYPAL_API = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !secret || secret === 'YOUR_PAYPAL_CLIENT_SECRET_HERE') {
    throw new Error('PayPal credentials not configured')
  }
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Failed to get PayPal token')
  return data.access_token
}

async function verifyPayPalWebhook(request, rawBody) {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (!webhookId) {
      console.warn('PAYPAL_WEBHOOK_ID not set — skipping verification in dev')
      return true
    }

    const accessToken = await getPayPalAccessToken()
    const verifyRes = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: request.headers.get('paypal-auth-algo'),
        cert_url: request.headers.get('paypal-cert-url'),
        transmission_id: request.headers.get('paypal-transmission-id'),
        transmission_sig: request.headers.get('paypal-transmission-sig'),
        transmission_time: request.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    })
    const result = await verifyRes.json()
    return result.verification_status === 'SUCCESS'
  } catch (err) {
    console.error('PayPal verification error:', err)
    return false
  }
}

export async function POST(request) {
  try {
    const rawBody = await request.text()

    const verified = await verifyPayPalWebhook(request, rawBody)
    if (!verified) {
      console.error('PayPal webhook signature verification FAILED')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
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
            company_id, event_type: 'subscription_created',
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
              company_id: company.id, event_type: 'payment_succeeded',
              amount: parseFloat(resource.amount?.total || 0),
              description: 'PayPal payment received',
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
