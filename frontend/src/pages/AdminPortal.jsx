import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from '../api'
import { AuthContext } from '../context/AuthContext'

const nav = [
  ['dashboard', 'Dashboard', '/admin/dashboard'],
  ['patients', 'Patients', '/admin/patients'],
  ['doctors', 'Doctors', '/admin/doctors'],
  ['appointments', 'Appointments', '/admin/appointments'],
  ['reports', 'Reports', '/admin/reports'],
  ['records', 'Medical Records', '/admin/records'],
  ['payments', 'Payments', '/admin/payments'],
  ['analytics', 'Analytics', '/admin/analytics'],
  ['settings', 'Settings', '/admin/settings'],
]

const statusClass = (status = '') => {
  const normalized = String(status).toLowerCase()
  if (['active', 'completed', 'confirmed', 'verified'].includes(normalized)) return 'status-confirmed'
  if (['pending', 'requested', 'review', 'changes_requested'].includes(normalized)) return 'status-pending'
  return 'status-cancelled'
}

const statusLabel = (status = '') => {
  const normalized = String(status).toLowerCase()
  if (normalized === 'verified') return 'Verified'
  if (normalized === 'rejected') return 'Rejected'
  if (normalized === 'changes_requested') return 'Changes Requested'
  if (normalized === 'pending') return 'Pending'
  return status || 'Pending'
}

const Card = ({ title, children, className = '' }) => (
  <section className={`card ${className}`}>
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    {children}
  </section>
)

const Table = ({ headers, rows, renderRow }) => (
  <div className="mt-5 overflow-x-auto">
    <table className="data-table">
      <thead>
        <tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr>
      </thead>
      <tbody>{rows.map((row, index) => <tr key={row.id || index}>{renderRow(row)}</tr>)}</tbody>
    </table>
  </div>
)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminPortal() {
  const { user, setUser } = useContext(AuthContext)
  const navigate = useNavigate()
  const section = useLocation().pathname.split('/')[2] || 'dashboard'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [reports, setReports] = useState([])
  const [updatingDoctorId, setUpdatingDoctorId] = useState('')

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') {
      navigate('/')
      return
    }

    const loadAdminData = async () => {
      setLoading(true)
      setError('')
      try {
        const [summaryRes, patientsRes, doctorsRes, appointmentsRes, reportsRes] = await Promise.all([
          axios.get('/api/admin/summary'),
          axios.get('/api/admin/patients'),
          axios.get('/api/admin/doctors'),
          axios.get('/api/admin/appointments'),
          axios.get('/api/admin/reports'),
        ])
        setSummary(summaryRes.data || null)
        setPatients(Array.isArray(patientsRes.data) ? patientsRes.data : [])
        setDoctors(Array.isArray(doctorsRes.data) ? doctorsRes.data : [])
        setAppointments(Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [])
        setReports(Array.isArray(reportsRes.data) ? reportsRes.data : [])
      } catch (requestError) {
        setError(requestError.response?.data?.msg || 'Unable to load admin data right now.')
        setSummary(null)
        setPatients([])
        setDoctors([])
        setAppointments([])
        setReports([])
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [user, navigate])

  const appointmentStats = useMemo(() => {
    const counts = { requested: 0, confirmed: 0, completed: 0, cancelled: 0 }
    appointments.forEach((item) => {
      const key = String(item.status || '').toLowerCase()
      if (Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1
    })
    return counts
  }, [appointments])

  const updateDoctorVerification = async (doctorUserId, status) => {
    setError('')
    setUpdatingDoctorId(doctorUserId)
    try {
      await axios.patch(`/api/admin/doctors/${doctorUserId}/verification`, { status })
      setDoctors((current) => current.map((doctor) => (
        doctor.id === doctorUserId ? { ...doctor, status } : doctor
      )))
    } catch (requestError) {
      setError(requestError.response?.data?.msg || 'Unable to update doctor verification status.')
    } finally {
      setUpdatingDoctorId('')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  if (!user) return null
  if (user.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-[calc(100vh-4rem)]">
        <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-slate-950 lg:block">
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-300">CureLink</p>
            <h1 className="mt-2 text-xl font-bold text-white">Admin Console</h1>
            <p className="mt-1 text-xs text-slate-400">Platform operations</p>
          </div>
          <nav className="space-y-1 px-3">
            {nav.map(([id, label, to]) => (
              <Link
                key={id}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${section === id ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {label}
              </Link>
            ))}
            <button
              type="button"
              onClick={logout}
              className="mt-5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-300 hover:bg-red-950"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              Logout
            </button>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-slate-200 bg-white">
            <div className="container-max flex min-h-16 items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">CureLink Admin</p>
                <h2 className="text-lg font-bold capitalize text-slate-900">{section.replace('-', ' ')}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-slate-500 sm:block">{user.name || 'Administrator'}</span>
                <button type="button" onClick={logout} className="btn btn-ghost btn-sm text-red-600 lg:hidden">Logout</button>
              </div>
            </div>
          </header>

          <div className="container-max py-8">
            {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {section === 'dashboard' && <Dashboard summary={summary} appointments={appointments} loading={loading} />}
            {section === 'patients' && <Patients rows={patients} loading={loading} />}
            {section === 'doctors' && <Doctors rows={doctors} loading={loading} updatingDoctorId={updatingDoctorId} onUpdateVerification={updateDoctorVerification} />}
            {section === 'appointments' && <Appointments rows={appointments} loading={loading} />}
            {section === 'reports' && <Reports rows={reports} loading={loading} />}
            {section === 'records' && <Records rows={reports} loading={loading} />}
            {section === 'payments' && <Payments rows={appointments} reports={reports} loading={loading} />}
            {section === 'analytics' && <Analytics summary={summary} stats={appointmentStats} loading={loading} />}
            {section === 'settings' && <Settings user={user} />}
          </div>
        </main>
      </div>
    </div>
  )
}

function LoadingState({ label }) {
  return <p className="mt-4 text-sm text-slate-500">Loading {label}...</p>
}

function EmptyState({ label }) {
  return <p className="mt-4 text-sm text-slate-500">No {label} found.</p>
}

function Dashboard({ summary, appointments, loading }) {
  if (loading) return <Card title="Dashboard"><LoadingState label="dashboard data" /></Card>
  if (!summary) return <Card title="Dashboard"><EmptyState label="dashboard data" /></Card>

  const stats = [
    ['Total Patients', summary.totalPatients ?? 0, 'text-sky-600'],
    ['Total Doctors', summary.totalDoctors ?? 0, 'text-teal-600'],
    ['Appointments', summary.totalAppointments ?? 0, 'text-indigo-600'],
    ['Reports Uploaded', summary.totalReports ?? 0, 'text-amber-600'],
  ]

  const today = [
    ['New Patients', summary.todayNewPatients ?? 0],
    ['New Doctors', summary.todayNewDoctors ?? 0],
    ['Appointments', summary.todayAppointments ?? 0],
    ['Cancelled', summary.todayCancelled ?? 0],
  ]

  // Filter appointments for today's actual date (local context)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)

  const todayVisits = (appointments || []).filter((appt) => {
    const d = new Date(appt.dateTime || appt.date)
    return d >= todayStart && d < todayEnd
  })

  return (
    <>
      <div className="mb-8">
        <p className="text-sm font-semibold text-sky-600">Platform overview</p>
        <h2 className="mt-1 text-3xl font-bold text-slate-900">CureLink Admin</h2>
        <p className="mt-2 text-slate-500">A live operational view of the healthcare platform.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value, color]) => (
          <div className="card" key={label}>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="mt-2 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <Card title="Today's Activity" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {today.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-5">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="mt-1 text-sm text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </Card>
      
      <Card title="Today's Visits" className="mt-6">
        {todayVisits.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No appointments scheduled for today.</p>
        ) : (
          <Table
            headers={['Patient', 'Doctor', 'Time', 'Status', 'Details']}
            rows={todayVisits}
            renderRow={(row) => (
              <>
                <td className="text-sm font-medium text-slate-900">{row.patientName}</td>
                <td className="text-sm text-slate-700">{row.doctorName}</td>
                <td className="text-sm text-slate-700 font-medium text-sky-700">
                  {new Date(row.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td>
                  <span className={`status-badge ${statusClass(row.status)}`}>
                    {row.status}
                  </span>
                </td>
                <td className="text-sm text-slate-500 max-w-xs truncate" title={row.reason}>
                  {row.reason}
                </td>
              </>
            )}
          />
        )}
      </Card>
    </>
  )
}

function Patients({ rows, loading }) {
  if (loading) return <Card title="Patients"><LoadingState label="patients" /></Card>
  if (!rows.length) return <Card title="Patients"><EmptyState label="patients" /></Card>

  return (
    <Card title="Patients">
      <Table
        headers={['Patient Name', 'Email', 'Registration Date', 'Appointments', 'Status']}
        rows={rows}
        renderRow={(row) => (
          <>
            <td className="text-sm text-slate-700">{row.name}</td>
            <td className="text-sm text-slate-700">{row.email}</td>
            <td className="text-sm text-slate-700">{formatDate(row.registrationDate)}</td>
            <td className="text-sm text-slate-700">{row.appointmentsCount ?? 0}</td>
            <td><span className={`status-badge ${statusClass(row.status)}`}>{row.status}</span></td>
          </>
        )}
      />
    </Card>
  )
}

function Doctors({ rows, loading, updatingDoctorId, onUpdateVerification }) {
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'pending', 'verified'

  if (loading) return <Card title="Doctor Verification & Directory"><LoadingState label="doctors" /></Card>
  if (!rows.length) return <Card title="Doctor Verification & Directory"><EmptyState label="doctors" /></Card>

  const pendingDoctors = rows.filter((d) => String(d.status).toLowerCase() === 'pending')
  const filteredRows = filter === 'pending'
    ? pendingDoctors
    : filter === 'verified'
      ? rows.filter((d) => String(d.status).toLowerCase() === 'verified')
      : rows

  return (
    <div className="space-y-6">
      {/* Pending verification highlight banner */}
      {pendingDoctors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-bold">
                {pendingDoctors.length}
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-base">Pending Doctor Verification Requests</h3>
                <p className="text-xs text-amber-700">{pendingDoctors.length} newly registered doctor(s) waiting for admin review and approval.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className="btn btn-sm bg-amber-600 hover:bg-amber-700 text-white font-medium self-start sm:self-auto"
            >
              View Pending Requests
            </button>
          </div>
        </div>
      )}

      <Card title="Doctor Verification & Requests">
        {/* Filter controls */}
        <div className="mt-2 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === 'all' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Doctors ({rows.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Pending Verification ({pendingDoctors.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('verified')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === 'verified' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Verified ({rows.filter(d => String(d.status).toLowerCase() === 'verified').length})
          </button>
        </div>

        <Table
          headers={['Doctor', 'Email', 'Specialization', 'Qualification', 'Experience', 'Fee', 'Status', 'Actions']}
          rows={filteredRows}
          renderRow={(row) => (
            <>
              <td className="text-sm font-medium text-slate-900">{row.name}</td>
              <td className="text-sm text-slate-700">{row.email}</td>
              <td className="text-sm text-slate-700">{row.specialization}</td>
              <td className="text-sm text-slate-700">{row.qualification}</td>
              <td className="text-sm text-slate-700">{row.experience}</td>
              <td className="text-sm text-slate-700">{row.fees}</td>
              <td><span className={`status-badge ${statusClass(row.status)}`}>{statusLabel(row.status)}</span></td>
              <td>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDoctor(row)}
                    className="btn btn-ghost btn-sm text-sky-600"
                  >
                    Review Profile
                  </button>
                  {row.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={updatingDoctorId === row.id}
                        onClick={() => onUpdateVerification(row.id, 'verified')}
                        className="btn btn-ghost btn-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={updatingDoctorId === row.id}
                        onClick={() => onUpdateVerification(row.id, 'rejected')}
                        className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {row.status === 'verified' && (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                  {row.status === 'rejected' && (
                    <>
                      <button
                        type="button"
                        disabled={updatingDoctorId === row.id}
                        onClick={() => onUpdateVerification(row.id, 'verified')}
                        className="btn btn-ghost btn-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        Approve
                      </button>
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                        Rejected
                      </span>
                    </>
                  )}
                </div>
              </td>
            </>
          )}
        />
      </Card>

      {/* Profile Review Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className={`status-badge ${statusClass(selectedDoctor.status)} mb-2 inline-block`}>
                  {statusLabel(selectedDoctor.status)}
                </span>
                <h3 className="text-xl font-bold text-slate-900">{selectedDoctor.name}</h3>
                <p className="text-sm text-slate-500">{selectedDoctor.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Specialization</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedDoctor.specialization}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Qualification</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedDoctor.qualification}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Experience</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedDoctor.experience}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Consultation Fee</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedDoctor.fees}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Phone</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedDoctor.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400">Registration / License</p>
                  <p className="font-medium text-slate-900 mt-0.5">{selectedDoctor.registrationNumber}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Clinic / Hospital</p>
                <p className="font-medium text-slate-900">{selectedDoctor.clinic}</p>
              </div>

              {selectedDoctor.bio && (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-1">Bio / Profile Summary</p>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg text-xs leading-relaxed">{selectedDoctor.bio}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedDoctor(null)}
                className="btn btn-ghost btn-sm"
              >
                Close
              </button>
              {selectedDoctor.status === 'pending' && (
                <>
                  <button
                    type="button"
                    disabled={updatingDoctorId === selectedDoctor.id}
                    onClick={async () => {
                      await onUpdateVerification(selectedDoctor.id, 'rejected')
                      setSelectedDoctor((prev) => prev ? { ...prev, status: 'rejected' } : null)
                    }}
                    className="btn btn-danger btn-sm"
                  >
                    Reject Doctor
                  </button>
                  <button
                    type="button"
                    disabled={updatingDoctorId === selectedDoctor.id}
                    onClick={async () => {
                      await onUpdateVerification(selectedDoctor.id, 'verified')
                      setSelectedDoctor((prev) => prev ? { ...prev, status: 'verified' } : null)
                    }}
                    className="btn btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700"
                  >
                    Approve Doctor
                  </button>
                </>
              )}
              {selectedDoctor.status === 'rejected' && (
                <button
                  type="button"
                  disabled={updatingDoctorId === selectedDoctor.id}
                  onClick={async () => {
                    await onUpdateVerification(selectedDoctor.id, 'verified')
                    setSelectedDoctor((prev) => prev ? { ...prev, status: 'verified' } : null)
                  }}
                  className="btn btn-primary btn-sm bg-emerald-600 hover:bg-emerald-700"
                >
                  Approve Doctor
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Appointments({ rows, loading }) {
  if (loading) return <Card title="Appointments"><LoadingState label="appointments" /></Card>
  if (!rows.length) return <Card title="Appointments"><EmptyState label="appointments" /></Card>

  return (
    <Card title="Appointments">
      <Table
        headers={['Patient', 'Doctor', 'Date & Time', 'Status']}
        rows={rows}
        renderRow={(row) => (
          <>
            <td className="text-sm text-slate-700">{row.patientName}</td>
            <td className="text-sm text-slate-700">{row.doctorName}</td>
            <td className="text-sm text-slate-700">{formatDateTime(row.dateTime)}</td>
            <td><span className={`status-badge ${statusClass(row.status)}`}>{row.status}</span></td>
          </>
        )}
      />
    </Card>
  )
}

function Reports({ rows, loading }) {
  if (loading) return <Card title="Reports"><LoadingState label="reports" /></Card>
  if (!rows.length) return <Card title="Reports"><EmptyState label="reports" /></Card>

  return (
    <Card title="Reports">
      <Table
        headers={['Patient', 'File Name', 'Uploaded', 'Type', 'Link']}
        rows={rows}
        renderRow={(row) => (
          <>
            <td className="text-sm text-slate-700">{row.patientName}</td>
            <td className="text-sm text-slate-700">{row.fileName}</td>
            <td className="text-sm text-slate-700">{formatDate(row.uploadedAt)}</td>
            <td className="text-sm text-slate-700">{row.fileType}</td>
            <td className="text-sm text-slate-700">
              {row.url ? <a href={row.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">View</a> : '—'}
            </td>
          </>
        )}
      />
    </Card>
  )
}

function Records({ rows, loading }) {
  if (loading) return <Card title="Medical Records"><LoadingState label="medical records" /></Card>
  if (!rows.length) return <Card title="Medical Records"><EmptyState label="medical records" /></Card>

  return (
    <Card title="Medical Records">
      <Table
        headers={['Patient', 'Record Type', 'Date', 'Status']}
        rows={rows}
        renderRow={(row) => (
          <>
            <td className="text-sm text-slate-700">{row.patientName}</td>
            <td className="text-sm text-slate-700">{row.fileName}</td>
            <td className="text-sm text-slate-700">{formatDate(row.uploadedAt)}</td>
            <td><span className={`status-badge ${statusClass('completed')}`}>Recorded</span></td>
          </>
        )}
      />
    </Card>
  )
}

function Payments({ rows, reports, loading }) {
  if (loading) return <Card title="Payments"><LoadingState label="payment overview" /></Card>

  const completed = rows.filter((item) => item.status === 'completed').length
  const cancelled = rows.filter((item) => item.status === 'cancelled').length
  const requested = rows.filter((item) => item.status === 'requested').length

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Appointments Total', rows.length], ['Completed Consultations', completed], ['Cancelled Appointments', cancelled], ['Reports Stored', reports.length]].map(([label, value]) => (
          <div className="card" key={label}>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>
      <Card title="Payment overview" className="mt-6">
        <p className="mt-3 text-sm text-slate-500">Requested appointments currently in queue: {requested}</p>
      </Card>
    </>
  )
}

function Analytics({ summary, stats, loading }) {
  if (loading) return <Card title="Analytics"><LoadingState label="analytics" /></Card>
  if (!summary) return <Card title="Analytics"><EmptyState label="analytics data" /></Card>

  const completionRate = summary.totalAppointments
    ? Math.round(((stats.completed || 0) / summary.totalAppointments) * 100)
    : 0

  return (
    <>
      <Card title="Platform analytics">
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ['Requested Appointments', stats.requested || 0],
            ['Confirmed Appointments', stats.confirmed || 0],
            ['Completed Appointments', stats.completed || 0],
            ['Completion Rate', `${completionRate}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-100 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{label}</p>
                <span className="font-bold text-slate-900">{value}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function Settings({ user }) {
  return (
    <Card title="Admin Settings">
      <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
        <div>
          <p className="field-label">Admin name</p>
          <p className="text-sm text-slate-700">{user.name || 'Administrator'}</p>
        </div>
        <div>
          <p className="field-label">Email</p>
          <p className="text-sm text-slate-700">{user.email}</p>
        </div>
      </div>
    </Card>
  )
}
