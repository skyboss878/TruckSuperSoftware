import { NextResponse } from 'next/server'

export async function POST(request) {
  // PayPal doesn't have a self-serve billing portal like Stripe.
  // Direct them to manage subscriptions in their PayPal account.
  return NextResponse.json({ url: 'https://www.paypal.com/myaccount/autopay/' })
}
