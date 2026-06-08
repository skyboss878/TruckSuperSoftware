'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function AdminTicketDetail() {
  const router = useRouter()
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => { loadTicket() }, [])

  async function loadTicket() {
    const res = await fetch(`/api/tickets/${id}`)
    const data = await res.json()
    setTicket(data?.id ? data : null)
    setDriver(data?.drivers)
    setForm({
      customer_name: data?.customer_name || '',
      load_id: data?.load_id || '',
      bol_number: data?.bol_number || '',
      date: data?.date || '',
      location_loaded: data?.location_loaded || '',
      notes: data?.notes || '',
    })
    setLoading(false)
  }

  async function updateStatus(status) {
    setUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await loadTicket()
    setUpdating(false)
  }

  async function saveEdits() {
    setUpdating(true)
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    await loadTicket()
    setEditing(false)
    setUpdating(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>
  if (!ticket) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Ticket not found</p></div>

  const statusColor = {
    started: 'bg-yellow-100 text-yellow-700',
    submitted: 'bg-blue-100 text-blue-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  const totalWeight = ticket.boxes?.reduce((s, b) => s + (parseFloat(b.weight) || 0), 0) || 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#2D7A5F] font-medium">← Back</button>
        <h1 className="text-lg font-bold text-gray-800 flex-1 text-center">Ticket Detail</h1>
        <button onClick={() => setEditing(!editing)} className="text-[#2D7A5F] text-sm font-medium">
          {editing ? 'Cancel' : '✏️ Edit'}
        </button>
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-gray-700">Status</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
              {ticket.status}
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {ticket.status !== 'approved' && (
              <button onClick={() => updateStatus('approved')} disabled={updating}
                className="flex-1 bg-green-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-40">
                ✓ Approve
              </button>
            )}
            {ticket.status !== 'rejected' && (
              <button onClick={() => updateStatus('rejected')} disabled={updating}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-40">
                ✕ Reject
              </button>
            )}
            {ticket.status === 'rejected' && (
              <button onClick={() => updateStatus('submitted')} disabled={updating}
                className="flex-1 bg-blue-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-40">
                ↩ Reopen
              </button>
            )}
          </div>
        </div>

        {/* Driver */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-2">Driver</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2D7A5F] flex items-center justify-center text-white font-bold">
              {driver?.name?.[0]}
            </div>
            <div>
              <p className="font-medium text-gray-800">{driver?.name}</p>
              <p className="text-xs text-gray-400">Truck #{driver?.truck_number || 'N/A'} · Trailer #{driver?.trailer_number || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Ticket Info - Edit or View */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Load Information</h2>
          {editing ? (
            <div className="space-y-3">
              {[
                { label: 'Customer', key: 'customer_name' },
                { label: 'Load ID', key: 'load_id' },
                { label: 'BOL Number', key: 'bol_number' },
                { label: 'Date', key: 'date', type: 'date' },
                { label: 'Location Loaded', key: 'location_loaded' },
                { label: 'Notes', key: 'notes' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-xs text-gray-400 font-medium uppercase">{label}</label>
                  <input type={type || 'text'} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 mt-1 text-sm outline-none focus:border-[#2D7A5F]" />
                </div>
              ))}
              <button onClick={saveEdits} disabled={updating}
                className="w-full bg-[#2D7A5F] text-white py-3 rounded-xl font-semibold disabled:opacity-40">
                {updating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {[
                ['Customer', ticket.customer_name],
                ['Load ID', ticket.load_id],
                ['BOL Number', ticket.bol_number],
                ['Date', ticket.date],
                ['Location', ticket.location_loaded],
                ['PO Number', ticket.po_number],
                ['Sand Type', ticket.sand_type],
                ['Arrival', ticket.arrival_time],
                ['Departed', ticket.departed_time],
                ['Notes', ticket.notes],
              ].filter(([_, v]) => v).map(([label, value]) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="text-gray-800 text-sm font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Boxes */}
        {ticket.boxes?.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between mb-2">
              <h2 className="font-bold text-gray-700">Boxes & Weight</h2>
              <span className="text-sm font-bold text-[#2D7A5F]">{totalWeight.toFixed(1)}t total</span>
            </div>
            {ticket.boxes.map((box, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-gray-600 text-sm">Box {box.box}</span>
                <span className="text-gray-800 text-sm font-medium">{box.weight} ton</span>
              </div>
            ))}
          </div>
        )}

        {/* Signature */}
        {ticket.bol_signature_url && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-2">BOL Signature</h2>
            <img src={ticket.bol_signature_url} alt="Signature" className="w-full rounded-xl border border-gray-100" />
          </div>
        )}

        {/* Delete */}
        <button onClick={async () => {
          if (confirm('Delete this ticket? This cannot be undone.')) {
            await fetch(`/api/tickets/${id}`, { method: 'DELETE' })
            router.replace('/admin')
          }
        }} className="w-full bg-red-50 text-red-500 py-3 rounded-2xl font-semibold text-sm">
          🗑 Delete Ticket
        </button>
      </div>
    </div>
  )
}
