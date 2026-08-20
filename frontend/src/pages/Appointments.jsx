import React, { useEffect, useState } from 'react'
import axios from '../api'
import { Link } from 'react-router-dom'

export default function Appointments() {
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(null)

  const loadAppointments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('/api/appointments/my')
      setAppts(res.data)
    } catch (err) {
      console.error(err)
      const msg = err.response?.status === 401
        ? 'Please log in to view your appointments.'
        : 'Could not load appointments. The server may be starting up — please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAppointments() }, [])

  const handleCancel = async (appointmentId) => {
    if (!confirm('Cancel this appointment?')) return
    setCancelling(appointmentId)
    try {
      await axios.post(`/api/appointments/cancel/${appointmentId}`, {})
      await loadAppointments()
    } catch (err) {
      console.error(err)
      alert('Failed to cancel appointment')
    } finally {
      setCancelling(null)
    }
  }

  const statusClass = (s) => ({
    requested: 'status-badge status-pending',
    confirmed:  'status-badge status-confirmed',
    completed:  'status-badge status-completed',
    cancelled:  'status-badge status-cancelled',
  }[s] || 'status-badge bg-slate-100 text-slate-600')

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading appointments…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="page-body">
          <div className="empty-state max-w-sm mx-auto">
            <div className="empty-state-icon bg-red-50">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">Failed to load appointments</h3>
            <p className="text-sm text-slate-500">{error}</p>
            <button onClick={loadAppointments} className="btn btn-primary btn-sm mt-2">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      {/* Page header */}
      <div className="page-header">
        <div className="container-max flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">My Appointments</h1>
            <p className="page-subtitle">Track and manage your scheduled visits</p>
          </div>
          <Link to="/book-appointment" className="btn btn-primary btn-sm flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Book new
          </Link>
        </div>
      </div>

      <div className="page-body">
        {appts.length === 0 ? (
          <div className="empty-state max-w-sm mx-auto">
            <div className="empty-state-icon">
              <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No appointments yet</h3>
            <p className="text-sm text-slate-500">Book your first appointment with a verified doctor.</p>
            <Link to="/book-appointment" className="btn btn-primary btn-sm mt-2">Find a doctor</Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="card hidden md:block overflow-hidden p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Date &amp; Time</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appts.map(a => (
                    <tr key={a._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {(a.doctor?.name || a.doctor?.user?.name)?.charAt(0)?.toUpperCase() || 'D'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">
                              {a.doctor?.name || a.doctor?.user?.name || 'Doctor'}
                            </div>
                            <div className="text-xs text-slate-400">{a.doctor?.specialization || 'General'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm font-medium text-slate-900">{fmtDate(a.date)}</div>
                        <div className="text-xs text-slate-400">{fmtTime(a.date)}</div>
                      </td>
                      <td className="text-sm text-slate-600">{a.reason || '—'}</td>
                      <td><span className={statusClass(a.status)}>{a.status}</span></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link to={`/doctors/${a.doctor?._id}`} className="btn btn-ghost btn-sm">View</Link>
                          {a.status === 'requested' && (
                            <button
                              onClick={() => handleCancel(a._id)}
                              disabled={cancelling === a._id}
                              className="btn btn-danger btn-sm"
                            >
                              {cancelling === a._id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {appts.map(a => (
                <div key={a._id} className="card">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {(a.doctor?.name || a.doctor?.user?.name)?.charAt(0)?.toUpperCase() || 'D'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">
                        {a.doctor?.name || a.doctor?.user?.name || 'Doctor'}
                      </div>
                      <div className="text-xs text-slate-400">{a.doctor?.specialization || 'General'}</div>
                    </div>
                    <span className={statusClass(a.status)}>{a.status}</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div>{fmtDate(a.date)} at {fmtTime(a.date)}</div>
                    {a.reason && <div className="text-slate-600">{a.reason}</div>}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <Link to={`/doctors/${a.doctor?._id}`} className="btn btn-secondary btn-sm flex-1 text-center">View doctor</Link>
                    {a.status === 'requested' && (
                      <button
                        onClick={() => handleCancel(a._id)}
                        disabled={cancelling === a._id}
                        className="btn btn-danger btn-sm"
                      >
                        {cancelling === a._id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
