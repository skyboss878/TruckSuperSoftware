'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function SuccessContent() {
  const router = useRouter()
  const params = useSearchParams()
  const company_id = params.get('company_id')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); router.push('/login'); }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div style={{ minHeight:'100vh',background:'#050c14',color:'white',fontFamily:'-apple-system,sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,textAlign:'center' }}>
      <div style={{ fontSize:80,marginBottom:24,animation:'bounce 1s ease infinite' }}>🚛</div>
      <h1 style={{ fontSize:32,fontWeight:900,marginBottom:12,letterSpacing:-1 }}>Welcome to TruckSuperSoftware!</h1>
      <p style={{ fontSize:16,color:'rgba(255,255,255,0.5)',marginBottom:8,maxWidth:400 }}>Your 14-day free trial has started. No charge until your trial ends.</p>
      <div style={{ margin:'24px 0',padding:20,background:'rgba(45,122,95,0.1)',border:'1px solid rgba(45,122,95,0.25)',borderRadius:16,maxWidth:360,width:'100%' }}>
        {[
          '✅ Account created',
          '✅ 14-day free trial started',
          '✅ Load board access enabled',
          '✅ Fleet tracking activated',
          '⏳ RTS setup — within 24hrs',
        ].map(item => (
          <div key={item} style={{ padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:14,color:'rgba(255,255,255,0.7)',textAlign:'left' }}>{item}</div>
        ))}
      </div>
      <p style={{ fontSize:14,color:'rgba(255,255,255,0.3)',marginBottom:24 }}>Redirecting to dashboard in {countdown}s...</p>
      <button onClick={()=>router.push('/login')} style={{ padding:'14px 36px',background:'#2D7A5F',border:'none',borderRadius:14,color:'white',fontSize:15,fontWeight:800,cursor:'pointer' }}>
        Go to Dashboard →
      </button>
    </div>
  )
}

export default function OnboardSuccess() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh',background:'#050c14' }} />}>
      <SuccessContent />
    </Suspense>
  )
}
