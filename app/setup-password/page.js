'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function SetupPassword() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Supabase client auto-detects the invite token in the URL hash
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function handleSubmit() {
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(error.message)
    window.location.href = '/driver'
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0a0f1a',padding:'20px'}}>
      <div style={{width:'100%',maxWidth:'400px',background:'#111827',borderRadius:'12px',padding:'32px',border:'1px solid #1f2937'}}>
        <h1 style={{color:'#fff',fontSize:'24px',marginBottom:'8px'}}>🚛 Set Your Password</h1>
        <p style={{color:'#9ca3af',fontSize:'14px',marginBottom:'24px'}}>
          {ready ? 'Create a password to access your driver dashboard.' : 'Verifying your invite link...'}
        </p>
        {ready && (
          <>
            <input type="password" placeholder="New password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #374151',background:'#1f2937',color:'#fff',boxSizing:'border-box'}} />
            <input type="password" placeholder="Confirm password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              style={{width:'100%',padding:'12px',marginBottom:'12px',borderRadius:'8px',border:'1px solid #374151',background:'#1f2937',color:'#fff',boxSizing:'border-box'}} />
            {error && <p style={{color:'#f87171',fontSize:'13px',marginBottom:'12px'}}>{error}</p>}
            <button onClick={handleSubmit} disabled={loading}
              style={{width:'100%',padding:'14px',borderRadius:'8px',border:'none',background:'#059669',color:'#fff',fontSize:'16px',fontWeight:'600',cursor:'pointer'}}>
              {loading ? 'Saving...' : 'Set Password & Continue →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
