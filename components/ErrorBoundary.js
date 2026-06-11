'use client'
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error })
    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client_error', message: error?.message, url: typeof window !== 'undefined' ? window.location.pathname : '' }),
    }).catch(() => {})
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f9fafb' }}>
          <div style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🚛</div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#111', margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.5 }}>
              The app hit an unexpected error. Your data is safe.
            </p>
            <button onClick={() => window.location.reload()}
              style={{ width: '100%', padding: '14px', background: '#2D7A5F', border: 'none', borderRadius: '14px', color: 'white', fontWeight: '700', fontSize: '15px', cursor: 'pointer', marginBottom: '10px' }}>
              Reload App
            </button>
            <button onClick={() => { window.location.href = '/' }}
              style={{ width: '100%', padding: '14px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px', color: '#374151', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
              Go to Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
