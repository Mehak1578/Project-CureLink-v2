import React, { useEffect, useState } from 'react'
import axios from '../api'
import { Link } from 'react-router-dom'

export default function MyReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('/api/reports/my')
      setReports(res.data)
    } catch (err) {
      console.error('Failed to load reports:', err)
      const msg = err.response?.status === 401
        ? 'Please log in to view your reports.'
        : 'Could not load reports. The server may be starting up — please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <span>Loading reports…</span>
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
            <h3 className="text-base font-semibold text-slate-900">Failed to load reports</h3>
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
        <div className="container-max flex items-center justify-between gap-4">
          <div>
            <h1 className="page-title">Medical Reports</h1>
            <p className="page-subtitle">Access and manage your medical documents</p>
          </div>
          <Link to="/upload-report" className="btn btn-primary btn-sm flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </Link>
        </div>
      </div>

      <div className="page-body">
        {reports.length === 0 ? (
          <div className="empty-state max-w-sm mx-auto">
            <div className="empty-state-icon">
              <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-900">No reports yet</h3>
            <p className="text-sm text-slate-500">Upload your medical reports to access AI-powered insights and keep them organized.</p>
            <Link to="/upload-report" className="btn btn-primary btn-sm mt-2">Upload first report</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {reports.map(r => (
              <div key={r._id} className="card-hover flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate" title={r.filename || 'Medical Report'}>
                      {r.filename || 'Medical Report'}
                    </h3>
                    <div className="text-xs text-slate-400 mt-1">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {r.analysis ? (
                  <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold mb-1">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      AI Analysis Available
                    </div>
                    <p className="text-xs text-emerald-600 line-clamp-2">{r.analysis}</p>
                  </div>
                ) : (
                  <div className="mb-4 p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs text-slate-500 font-medium">No analysis generated yet</span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-5">
                  <span className="truncate">{r.contentType || 'PDF Document'}</span>
                  {r.size && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>{(r.size / 1024).toFixed(0)} KB</span>
                    </>
                  )}
                </div>

                <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm flex-1 text-center"
                  >
                    View
                  </a>
                  <Link
                    to={`/analyze/${r._id}`}
                    className="btn btn-primary btn-sm flex-1 text-center"
                  >
                    Analyze
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
