import React, { useEffect, useState } from 'react'
import axios from '../api'
import { Link } from 'react-router-dom'

export default function DoctorsList() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('/api/doctors')
      setDoctors(res.data)
    } catch (err) {
      console.error(err)
      setError('Could not load doctors. The server may be starting up — please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading doctors…</span>
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
            <h3 className="text-base font-semibold text-slate-900">Failed to load doctors</h3>
            <p className="text-sm text-slate-500">{error}</p>
            <button onClick={load} className="btn btn-primary btn-sm mt-2">Try again</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      {/* Page header */}
      <div className="page-header">
        <div className="container-max">
          <h1 className="page-title">Our Doctors</h1>
          <p className="page-subtitle">Browse verified specialists and book an appointment</p>
        </div>
      </div>

      {/* Content */}
      <div className="page-body">
        {doctors.length === 0 ? (
          <div className="empty-state max-w-sm mx-auto">
            <div className="empty-state-icon">
              <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No doctors found</h3>
            <p className="text-sm text-slate-500">No doctors are currently listed. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {doctors.map(d => (
              <div key={d._id} className="card-hover flex flex-col">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                    {d.user?.name?.charAt(0)?.toUpperCase() || 'D'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">
                      Dr. {(d.user?.name || 'Doctor').replace(/^(Dr\.\s*)+/i, '')}
                    </h3>
                    <span className="medical-badge mt-1">{d.specialization}</span>
                  </div>
                  {d.verified && (
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-3">
                  <span>{d.experience || 0} yrs experience</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-medium text-slate-700">₹{d.fees || '—'} fee</span>
                </div>

                {d.bio && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{d.bio}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <Link
                    to={`/doctors/${d._id}`}
                    className="btn btn-primary btn-sm flex-1 text-center"
                  >
                    View Profile
                  </Link>
                  <Link
                    to="/book-appointment"
                    state={{ doctor: d }}
                    className="btn btn-secondary btn-sm"
                  >
                    Book
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
