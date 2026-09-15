import React, { useContext, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import axios from '../api'

const CheckIcon = () => (
  <svg className="w-5 h-5 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const ArrowRight = ({ cls = 'w-4 h-4' }) => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const stats = [
  { value: '500+', label: 'Verified Doctors', sub: 'Across 30+ specializations', color: 'text-sky-600' },
  { value: '10k+', label: 'Appointments Booked', sub: 'And counting every month', color: 'text-teal-600' },
  { value: '50k+', label: 'Reports Managed', sub: 'Securely stored & analyzed', color: 'text-cyan-600' },
  { value: '98%', label: 'Patient Satisfaction', sub: 'Based on post-visit surveys', color: 'text-emerald-600' },
]

const steps = [
  {
    n: '01',
    title: 'Create Your Account',
    desc: 'Sign up in under two minutes. Your profile is private, secure, and HIPAA-aligned from day one.',
  },
  {
    n: '02',
    title: 'Find the Right Doctor',
    desc: 'Browse verified specialists by expertise, availability, and consultation fee. Read profiles before you book.',
  },
  {
    n: '03',
    title: 'Book an Appointment',
    desc: 'Pick a date and time that suits you. Receive instant confirmation and status updates throughout.',
  },
  {
    n: '04',
    title: 'Manage Your Records',
    desc: 'Upload lab results, prescriptions, and scans. Our AI summarizes findings so you stay informed.',
  },
]

const testimonials = [
  {
    quote: 'CureLink made scheduling my cardiology follow-up completely painless. I had a confirmed slot within minutes.',
    name: 'Priya Mehta',
    role: 'Patient — Cardiology',
    initials: 'PM',
  },
  {
    quote: 'I uploaded three years of lab reports and the AI summary helped my new doctor understand my history instantly.',
    name: 'Arjun Sharma',
    role: 'Patient — General Medicine',
    initials: 'AS',
  },
  {
    quote: "Having all my children's records in one place, with appointment reminders, has been a game changer for our family.",
    name: 'Fatima Noor',
    role: 'Parent — Paediatrics',
    initials: 'FN',
  },
]

const benefits = [
  'Verified, credentialed doctors only',
  'End-to-end encrypted health records',
  'Real-time appointment status updates',
  'AI-assisted report summarisation',
  'Multi-specialist care under one platform',
  'No hidden consultation fees',
]

const DashboardIcon = ({ children, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={children} />
  </svg>
)

const formatDate = date => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
const formatTime = date => new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const doctorName = appointment => appointment.doctor?.user?.name || appointment.doctor?.name || 'Doctor'
const doctorSpecialization = appointment => appointment.doctor?.specialization || 'Specialist'

const statusClass = (status) => {
  switch (String(status).toLowerCase()) {
    case 'confirmed':
      return 'status-confirmed'
    case 'pending':
    case 'requested':
      return 'status-pending'
    case 'completed':
      return 'status-completed'
    case 'cancelled':
      return 'status-cancelled'
    default:
      return 'status-pending'
  }
}

const appointmentCardClass = (status) => {
  if (status === 'cancelled') {
    return 'block rounded-xl border border-red-100 bg-red-50/60 p-4 transition hover:border-red-300'
  }
  return 'block rounded-xl border border-teal-100 bg-teal-50/60 p-4 transition hover:border-teal-300'
}

function FeaturedDoctors() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    axios.get('/api/doctors')
      .then((res) => {
        if (active) {
          const unique = []
          const seen = new Set()
          for (const doc of res.data || []) {
            const id = String(doc._id || doc.id)
            if (id && !seen.has(id)) {
              seen.add(id)
              unique.push(doc)
            }
          }
          setDoctors(unique)
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading || !doctors.length) return null

  return (
    <section className="bg-slate-50/80 py-20 border-t border-slate-100">
      <div className="container-max">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Our Healthcare Professionals</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">Verified Doctors</h2>
            <p className="text-slate-500 max-w-lg mt-1 text-sm">Browse approved specialists ready to provide quality healthcare.</p>
          </div>
          <Link to="/doctors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-700">
            View all doctors <ArrowRight />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {doctors.slice(0, 6).map((doctor) => {
            const name = doctor.user?.name || doctor.name || 'Doctor'
            const avatar = doctor.user?.avatar
            return (
              <div key={doctor._id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-sky-100 text-sky-700 font-bold text-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-slate-900 truncate">Dr. {name.replace(/^(Dr\.\s*)+/i, '')}</h3>
                      <span className="text-emerald-500 flex-shrink-0" title="Verified Doctor">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-sky-600 mt-0.5">{doctor.specialization || 'General Specialist'}</p>
                    <p className="text-xs text-slate-500 mt-1">{doctor.experience ? `${doctor.experience} yrs exp.` : 'Experienced'} • {doctor.fees ? `₹${doctor.fees}` : 'Consultation'}</p>
                  </div>
                </div>
                {doctor.bio && (
                  <p className="text-xs text-slate-500 mt-4 line-clamp-2 leading-relaxed flex-1">{doctor.bio}</p>
                )}
                <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                  <Link to={`/doctors/${doctor._id}`} className="btn btn-ghost btn-sm flex-1 text-center text-xs">
                    View Profile
                  </Link>
                  <Link to="/book-appointment" state={{ doctor }} className="btn btn-primary btn-sm flex-1 text-center text-xs">
                    Book Appointment
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function EmptyDashboardCard({ icon, title, description, action, to }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><DashboardIcon>{icon}</DashboardIcon></div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
      {action && <Link to={to} className="btn btn-primary btn-sm mt-4">{action}</Link>}
    </div>
  )
}

function PatientDashboard({ user }) {
  const [appointments, setAppointments] = useState([])
  const [reports, setReports] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    setError('')
    try {
      const [appointmentsResponse, reportsResponse, notificationsResponse] = await Promise.all([
        axios.get('/api/appointments/my'),
        axios.get('/api/reports/my'),
        axios.get('/api/notifications').catch(() => ({ data: [] })),
      ])
      setAppointments(appointmentsResponse.data || [])
      setReports(reportsResponse.data || [])
      setNotifications(notificationsResponse.data || [])
    } catch (requestError) {
      setError(requestError.response?.status === 401 ? 'Please sign in again to view your dashboard.' : 'Could not load your healthcare data right now.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [user])

  if (loading) return <div className="page-loading"><div className="spinner" /><span>Loading your dashboard...</span></div>
  if (error) return <div className="page-shell"><div className="page-body"><div className="empty-state max-w-md mx-auto"><div className="empty-state-icon bg-red-50"><DashboardIcon className="text-red-500">M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0</DashboardIcon></div><h2 className="text-base font-semibold text-slate-900">Dashboard unavailable</h2><p className="text-sm text-slate-500">{error}</p><button type="button" onClick={loadDashboard} className="btn btn-primary btn-sm mt-2">Try again</button></div></div></div>

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
  const upcoming = appointments.filter(appointment => new Date(appointment.date) >= now && appointment.status !== 'cancelled' && appointment.status !== 'rejected').sort((a, b) => new Date(a.date) - new Date(b.date))
  const today = appointments.filter(appointment => {
    const d = new Date(appointment.date)
    return d >= startOfToday && d < endOfToday
  }).sort((a, b) => new Date(a.date) - new Date(b.date))
  const nextAppointment = upcoming[0]
  const recentAppointments = appointments.filter(appointment => new Date(appointment.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3)
  const recentReports = reports.slice(0, 3)
  const activity = [
    ...recentAppointments.map(appointment => ({ date: new Date(appointment.updatedAt || appointment.date), label: `${doctorName(appointment)} appointment`, detail: appointment.status })),
    ...recentReports.map(report => ({ date: new Date(report.createdAt || report.uploadedAt), label: report.filename || report.fileName || 'Medical report uploaded', detail: 'Medical record' })),
  ].sort((a, b) => b.date - a.date).slice(0, 5)
  const firstName = (user.name || 'there').split(' ')[0]

  return <div className="page-shell"><div className="bg-gradient-to-r from-sky-700 to-teal-600 text-white"><div className="container-max py-10"><p className="text-sm font-medium text-sky-100">Patient dashboard</p><h1 className="mt-2 text-3xl font-bold">Good to see you, {firstName}</h1><p className="mt-2 max-w-xl text-sm text-sky-100">Keep track of your appointments and medical records in one secure place.</p></div></div><div className="container-max py-8">
    <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Link to="/book-appointment" className="btn btn-primary h-auto min-h-16 flex-col items-start gap-1 p-4 text-left"><DashboardIcon className="h-5 w-5">M12 4v16m8-8H4</DashboardIcon><span>Book Appointment</span></Link><Link to="/doctors" className="btn btn-secondary h-auto min-h-16 flex-col items-start gap-1 p-4 text-left"><DashboardIcon className="h-5 w-5">M16 7a4 4 0 1 1-8 0M5 21a7 7 0 0 1 14 0</DashboardIcon><span>Find Doctor</span></Link><Link to="/upload-report" className="btn btn-secondary h-auto min-h-16 flex-col items-start gap-1 p-4 text-left"><DashboardIcon className="h-5 w-5">M12 4v16m8-8H4</DashboardIcon><span>Upload Report</span></Link><Link to="/appointments" className="btn btn-secondary h-auto min-h-16 flex-col items-start gap-1 p-4 text-left"><DashboardIcon className="h-5 w-5">M8 7V3m8 4V3m-9 8h10m-9 8h10</DashboardIcon><span>View Appointments</span></Link></div>
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><section className="card"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Upcoming appointment</h2><p className="mt-1 text-sm text-slate-500">Your next scheduled visit</p></div><Link to="/appointments" className="text-sm font-semibold text-sky-600 hover:text-sky-700">View all</Link></div>{nextAppointment ? <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-600 text-lg font-bold text-white">{doctorName(nextAppointment).slice(0, 1).toUpperCase()}</div><div><h3 className="font-semibold text-slate-900">{doctorName(nextAppointment)}</h3><p className="text-sm text-slate-500">{doctorSpecialization(nextAppointment)}</p></div></div><span className={`status-badge ${nextAppointment.status === 'confirmed' ? 'status-confirmed' : 'status-pending'}`}>{nextAppointment.status}</span></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div className="flex items-center gap-2 text-slate-600"><DashboardIcon className="h-4 w-4 text-sky-600">M8 7V3m8 4V3m-9 8h10m-9 8h10</DashboardIcon>{formatDate(nextAppointment.date)}</div><div className="flex items-center gap-2 text-slate-600"><DashboardIcon className="h-4 w-4 text-sky-600">M12 6v6l4 2</DashboardIcon>{formatTime(nextAppointment.date)}</div></div><div className="mt-5 flex flex-wrap gap-2"><Link to="/appointments" className="btn btn-primary btn-sm">Manage appointment</Link><Link to={`/doctors/${nextAppointment.doctorId || nextAppointment.doctor?._id || nextAppointment.doctor?.user?._id}`} className="btn btn-secondary btn-sm">View doctor</Link></div></div> : <EmptyDashboardCard icon="M8 7V3m8 4V3m-9 8h10m-9 8h10" title="No upcoming appointments" description="Schedule a visit with a verified CureLink doctor when you are ready." action="Book Appointment" to="/book-appointment" />}</section>
      <section className="card">
        <h2 className="text-lg font-bold text-slate-900">Today</h2>
        <p className="mt-1 text-sm text-slate-500">Visits scheduled for today</p>
        {today.length ? (
          <div className="mt-5 space-y-3">
            {today.map(appointment => (
              <Link
                key={appointment._id}
                to="/appointments"
                className={appointmentCardClass(appointment.status)}
              >
                <p className="font-semibold text-slate-900">{doctorName(appointment)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatTime(appointment.date)} · {doctorSpecialization(appointment)}
                  {appointment.reason && ` · ${appointment.reason}`}
                </p>
                <span className={`mt-3 inline-block status-badge ${statusClass(appointment.status)}`}>
                  {appointment.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
            No appointments scheduled for today.
          </div>
        )}
      </section>
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-3"><section className="card"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Recent medical reports</h2><Link to="/my-reports" className="text-sm font-semibold text-sky-600">View all</Link></div>{recentReports.length ? <div className="space-y-3">{recentReports.map(report => <Link key={report._id} to={`/analyze/${report._id}`} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 transition hover:bg-sky-50"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><DashboardIcon className="h-4 w-4">M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6L19 7.4V19a2 2 0 0 1-2 2</DashboardIcon></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{report.filename || report.fileName || 'Medical report'}</p><p className="mt-1 text-xs text-slate-400">{new Date(report.createdAt || report.uploadedAt).toLocaleDateString()}</p></div></Link>)}</div> : <EmptyDashboardCard icon="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6L19 7.4V19a2 2 0 0 1-2 2" title="No medical reports yet" description="Upload a report to keep your health records organized." action="Upload Report" to="/upload-report" />}</section>
      <section className="card"><h2 className="mb-4 text-lg font-bold text-slate-900">Active prescriptions</h2><EmptyDashboardCard icon="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h4m-4 4h4m-4 4h2" title="No prescriptions recorded" description="Prescriptions will appear here when they are added to your CureLink record." /></section>
      <section className="card"><h2 className="mb-4 text-lg font-bold text-slate-900">Notifications</h2>{notifications.length ? <div className="space-y-3 max-h-60 overflow-y-auto">{notifications.slice(0, 5).map(n => <div key={n._id} className="p-3 bg-sky-50/60 border border-sky-100 rounded-lg"><p className="font-semibold text-slate-900 text-xs">{n.title}</p><p className="text-xs text-slate-600 mt-1">{n.message}</p></div>)}</div> : <EmptyDashboardCard icon="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" title="No new notifications" description="Important appointment and record updates will appear here." />}</section></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><section className="card"><h2 className="text-lg font-bold text-slate-900">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Your latest appointments and records</p>{activity.length ? <div className="mt-5 divide-y divide-slate-100">{activity.map((item, index) => <div key={`${item.label}-${item.date.toISOString()}-${index}`} className="flex items-center justify-between gap-4 py-3 first:pt-0"><div><p className="text-sm font-medium text-slate-800">{item.label}</p><p className="mt-1 text-xs text-slate-400">{item.detail}</p></div><time className="flex-shrink-0 text-xs text-slate-400">{item.date.toLocaleDateString()}</time></div>)}</div> : <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Your healthcare activity will appear here as you use CureLink.</div>}</section><section className="card"><h2 className="text-lg font-bold text-slate-900">Health record timeline</h2><p className="mt-1 text-sm text-slate-500">A summary of your records</p><div className="mt-5 space-y-3">{reports.length ? <div className="rounded-lg bg-sky-50 p-4 text-sm text-sky-800">{reports.length} medical report{reports.length === 1 ? '' : 's'} stored in your records.</div> : <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No health records have been uploaded yet.</div>}{appointments.length ? <div className="rounded-lg bg-teal-50 p-4 text-sm text-teal-800">{appointments.length} appointment{appointments.length === 1 ? '' : 's'} in your care history.</div> : <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No appointment history yet.</div>}</div></section></div>
    <div className="mt-8">
      <FeaturedDoctors />
    </div>
  </div></div>
}

export default function Dashboard() {
  const { user } = useContext(AuthContext)

  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />
    return <PatientDashboard user={user} />
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-700 via-sky-600 to-teal-600">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="container-max py-24 lg:py-32 relative">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 text-white text-sm font-medium mb-6 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Trusted by 10,000+ patients across India
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Healthcare That<br />Works Around You
            </h1>
            <p className="text-lg text-sky-100 mb-10 max-w-xl leading-relaxed">
              Book verified doctors, track appointments, and manage your complete medical history — from a single, secure dashboard.
            </p>
            <div className="flex flex-wrap gap-4">
              {user ? (
                <>
                  <Link to="/doctors" className="px-7 py-3.5 bg-white text-sky-700 font-semibold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm">
                    Find a Doctor
                  </Link>
                  <Link to="/appointments" className="px-7 py-3.5 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200 text-sm">
                    My Appointments
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="px-7 py-3.5 bg-white text-sky-700 font-semibold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm">
                    Get Started — It's Free
                  </Link>
                  <Link to="/login" className="px-7 py-3.5 border-2 border-white/40 text-white font-semibold rounded-lg hover:bg-white/10 transition-all duration-200 text-sm">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-white" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </section>

      {/* ── QUICK ACCESS ── */}
      <section className="container-max py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything in One Place</h2>
          <p className="text-slate-500 max-w-lg mx-auto">Access the tools you need most, right from your dashboard.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              to: '/doctors', color: 'bg-sky-50 border-sky-100', iconBg: 'bg-sky-600', linkColor: 'text-sky-600',
              label: 'Find Doctors',
              desc: 'Browse verified specialists across cardiology, dermatology, orthopaedics, and 30+ more fields.',
              cta: 'Browse all doctors',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
            },
            {
              to: '/appointments', color: 'bg-teal-50 border-teal-100', iconBg: 'bg-teal-600', linkColor: 'text-teal-600',
              label: 'Appointments',
              desc: 'Schedule, reschedule, or cancel visits. Track statuses from requested through to completed.',
              cta: 'View appointments',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
            },
            {
              to: '/my-reports', color: 'bg-indigo-50 border-indigo-100', iconBg: 'bg-indigo-600', linkColor: 'text-indigo-600',
              label: 'Medical Reports',
              desc: 'Upload lab results, prescriptions, and scans. Get AI-assisted summaries in plain language.',
              cta: 'Manage reports',
              icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
            },
          ].map(({ to, color, iconBg, linkColor, label, desc, cta, icon }) => (
            <Link key={to} to={to} className="group block border rounded-2xl p-7 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white" style={{ borderColor: 'inherit' }}>
              <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300`}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{label}</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-5">{desc}</p>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${linkColor} group-hover:gap-2.5 transition-all duration-200`}>
                {cta} <ArrowRight />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED VERIFIED DOCTORS ── */}
      <FeaturedDoctors />

      {/* ── HOW IT WORKS ── */}
      <section className="bg-slate-50 py-20">
        <div className="container-max">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Simple Process</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-3">How CureLink Works</h2>
            <p className="text-slate-500 max-w-lg mx-auto">From registration to your first appointment in four straightforward steps.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-md transition-shadow duration-300">
                <div className="text-4xl font-black text-sky-100 mb-4 leading-none">{n}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-20 bg-white">
        <div className="container-max">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">By the Numbers</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2">Trusted Healthcare at Scale</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(({ value, label, sub, color }) => (
              <div key={label} className="text-center p-6 rounded-2xl bg-slate-50 border border-slate-100">
                <div className={`text-4xl font-black mb-1 ${color}`}>{value}</div>
                <div className="font-semibold text-slate-800 text-sm mb-1">{label}</div>
                <div className="text-xs text-slate-400">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="bg-gradient-to-br from-sky-700 to-teal-600 py-20">
        <div className="container-max">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-semibold text-sky-200 uppercase tracking-wider">Why CureLink</span>
              <h2 className="text-3xl font-bold text-white mt-2 mb-4">Built for Patients,<br />Designed for Clarity</h2>
              <p className="text-sky-100 leading-relaxed mb-8">
                We built CureLink to solve the real problems patients face — scattered records, hard-to-reach doctors, and opaque appointment systems. Every feature is here for a reason.
              </p>
              <Link to={user ? '/doctors' : '/register'}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-sky-700 font-semibold rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm">
                {user ? 'Find a Doctor' : 'Get Started Free'} <ArrowRight />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {benefits.map(b => (
                <div key={b} className="flex items-center gap-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-5 py-4">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white font-medium text-sm">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 bg-slate-50">
        <div className="container-max">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-teal-600 uppercase tracking-wider">Patient Stories</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-3">What Our Patients Say</h2>
            <p className="text-slate-500 max-w-lg mx-auto">Real experiences from patients who manage their care on CureLink.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(({ quote, name, role, initials }) => (
              <div key={name} className="bg-white rounded-2xl p-7 border border-slate-100 hover:shadow-md transition-shadow duration-300 flex flex-col">
                <div className="flex mb-5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed flex-1 mb-6">"{quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {initials}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{name}</div>
                    <div className="text-xs text-slate-400">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 bg-white">
        <div className="container-max">
          <div className="bg-gradient-to-br from-sky-600 to-teal-600 rounded-3xl px-8 py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Take Control of Your Health?</h2>
            <p className="text-sky-100 mb-10 max-w-xl mx-auto">
              Join thousands of patients already managing their healthcare smarter. No paperwork, no waiting rooms, no confusion.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={user ? '/doctors' : '/register'}
                className="px-8 py-4 bg-white text-sky-700 font-bold rounded-xl hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                {user ? 'Find a Doctor' : 'Create Free Account'}
              </Link>
              <Link to="/doctors"
                className="px-8 py-4 border-2 border-white/40 text-white font-bold rounded-xl hover:bg-white/10 transition-all duration-200">
                Browse Doctors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400">
        <div className="container-max py-14">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-white font-bold text-xl">CureLink</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs mb-4">
                A modern healthcare management platform connecting patients with verified doctors and giving them full control over their health records.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Secure &amp; Private — Your data is always yours
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
              <ul className="space-y-2 text-sm">
                {[['/', 'Home'], ['/doctors', 'Find Doctors'], ['/appointments', 'Appointments'], ['/my-reports', 'Medical Reports'], ['/upload-report', 'Upload Report']].map(([to, label]) => (
                  <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm">Account</h4>
              <ul className="space-y-2 text-sm">
                {[...(user
                  ? [['/appointments', 'My Appointments'], ['/my-reports', 'My Reports']]
                  : [['/login', 'Sign In'], ['/register', 'Create Account']])
                ].map(([to, label]) => (
                  <li key={to}><Link to={to} className="hover:text-white transition-colors">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <span>© {new Date().getFullYear()} CureLink. All rights reserved.</span>
            <span>Built for better healthcare access.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
