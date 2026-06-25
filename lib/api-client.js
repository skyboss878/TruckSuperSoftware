import { supabase } from '@/lib/supabase'

// Use this instead of plain fetch() for any /api/* call that needs to know
// who the logged-in user is. It attaches the real Supabase access token so
// the server can verify identity instead of trusting a client-supplied id.
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {
    ...(options.headers || {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
  return fetch(url, { ...options, headers })
}
