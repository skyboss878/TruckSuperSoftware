'use client'
import { useState } from 'react'
import { authFetch } from '@/lib/api-client'
import { qdb } from '@/lib/ticket-queue'

const LABELS = {
  customer_name: 'Customer', location_delivered: 'Delivered to', po_number: 'PO #',
  afe_number: 'AFE #', sand_type: 'Product', quantity: 'Quantity', unit: 'Unit', bol_signed_by: 'Signed by',
}

export default function TicketCard({ n, onChange }) {
  const [vals, setVals] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const t = n.ticket
  const missing = n.missing || []
  const done = t?.status === 'submitted'

  async function save(submit) {
    setBusy(true); setErr('')
    try {
      const res = await authFetch('/api/tickets/voice/' + n.ticketId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: vals, submit }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Save failed')
      await qdb.notes.update(n.id, { missing: j.missing, ticket: j.ticket })
      setVals({}); onChange()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <div className="border rounded p-3">
      <div className="flex justify-between text-sm">
        <span>{new Date(n.ts).toLocaleTimeString()}</span>
        <span className={n.status === 'synced' ? 'text-blue-700' : 'text-yellow-700'}>
          {done ? 'Submitted to dispatch' : n.status === 'synced' ? 'Review and submit' : 'Waiting for signal'}
        </span>
      </div>
      {n.status === 'synced' && t && !done && (
        <div className="mt-2 space-y-2">
          {Object.keys(LABELS).map(k => {
            const v = vals[k] ?? t[k] ?? ''
            const isMissing = missing.includes(k) && vals[k] === undefined
            return (
              <label key={k} className="block text-xs">
                {LABELS[k]}
                <input value={v} inputMode={k === 'quantity' ? 'decimal' : 'text'}
                  onChange={e => setVals(s => ({ ...s, [k]: e.target.value }))}
                  className={'w-full border rounded p-2 text-sm ' + (isMissing ? 'border-red-500 bg-red-50' : '')} />
              </label>
            )
          })}
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button disabled={busy} onClick={() => save(true)}
            className="w-full bg-green-600 text-white rounded p-3 font-bold">
            {busy ? 'Saving...' : 'Submit to dispatch'}
          </button>
          {Object.keys(vals).length > 0 && (
            <button disabled={busy} onClick={() => save(false)} className="w-full border rounded p-2 text-sm">Save changes only</button>
          )}
        </div>
      )}
      {done && <div className="text-sm mt-2">{t.customer_name} · {t.quantity} {t.unit} {t.sand_type}</div>}
    </div>
  )
}
