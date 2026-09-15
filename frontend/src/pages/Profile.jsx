import React, { useContext, useEffect, useState } from 'react'
import axios from '../api'
import { Link, useSearchParams } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const emptyProfile = {
  phone: '', dateOfBirth: '', gender: '', address: '', bloodGroup: '', allergies: '',
  existingConditions: '', emergencyContactName: '', emergencyContactNumber: '',
}

const Icon = ({ children, className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={children} />
  </svg>
)

function Field({ label, name, value, type = 'text', onChange, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <input required={required} name={name} type={type} value={value || ''} onChange={onChange} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
    </label>
  )
}

function EmptyValue() { return <span className="italic text-slate-400">Not provided</span> }

export default function Profile() {
  const { user, setUser } = useContext(AuthContext)
  const [searchParams] = useSearchParams()
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true')
  const [details, setDetails] = useState({ ...emptyProfile, ...user })
  const [form, setForm] = useState({ ...emptyProfile, ...user })
  const [appointments, setAppointments] = useState([])
  const [reports, setReports] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const name = user?.name || 'Username not provided'
  const email = user?.email || ''
  const initials = (user?.name || 'U').slice(0, 2).toUpperCase()
  const userId = user?.id || user?._id
  const patientId = userId ? `CL-${userId.slice(-6).toUpperCase()}` : 'Not assigned'
  const hasDetails = Object.entries(details).some(([key, value]) => value && !['id', '_id', 'name', 'email', 'role'].includes(key))

  useEffect(() => {
    const load = async () => {
      try {
        const [profileResponse, appointmentResponse, reportResponse] = await Promise.all([
          axios.get('/api/auth/profile'),
          axios.get('/api/appointments/my'),
          axios.get('/api/reports/my'),
        ])
        setDetails({ ...emptyProfile, ...profileResponse.data })
        setForm({ ...emptyProfile, ...profileResponse.data })
        setUser(current => ({ ...current, ...profileResponse.data }))
        setAppointments(appointmentResponse.data || [])
        setReports(reportResponse.data || [])
      } catch (requestError) {
        setError(requestError.response?.status === 401 ? 'Please log in again to view your profile.' : 'Could not load your profile right now.')
      }
    }
    if (user) load()
  }, [])

  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const beginEdit = () => { setForm({ ...emptyProfile, ...details }); setEditing(true) }
  const save = async event => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const response = await axios.put('/api/auth/profile', form)
      setDetails({ ...emptyProfile, ...response.data })
      setUser(current => ({ ...current, ...response.data }))
      setEditing(false)
    } catch (requestError) {
      setError(requestError.response?.data?.msg || 'Could not save your profile.')
    } finally { setSaving(false) }
  }
  const display = value => value ? value : <EmptyValue />

  return <div className="page-shell">
    <div className="bg-gradient-to-r from-sky-700 to-teal-600 text-white"><div className="container-max py-10"><div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold ring-1 ring-white/30">{initials}</div><div><p className="mb-1 text-sm font-medium text-sky-100">Patient profile</p><h1 className="text-3xl font-bold">{name}</h1><p className="mt-1 text-sm text-sky-100">{email || 'Email not provided'}</p></div></div><button type="button" onClick={beginEdit} className="btn bg-white text-sky-700 shadow-sm hover:bg-sky-50"><Icon className="h-4 w-4">M15.2 3.8a2.1 2.1 0 0 1 3 3L8 17l-4 1 1-4 10.2-10.2ZM13 6l3 3</Icon>{hasDetails ? 'Edit Profile' : 'Complete Profile'}</button></div><p className="mt-6 text-xs font-medium uppercase tracking-wider text-sky-100">Patient ID <span className="ml-2 rounded bg-white/15 px-2 py-1 text-white">{patientId}</span></p></div></div>
    <div className="container-max py-8">{error && <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}{!editing && !hasDetails && <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4"><div><p className="font-semibold text-slate-900">Complete your profile to keep your healthcare information organized.</p><p className="mt-1 text-sm text-slate-600">Add details that help your care team support you.</p></div><button type="button" onClick={beginEdit} className="btn btn-primary">Complete Profile</button></div>}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">{editing ? <form onSubmit={save} className="card lg:col-span-2"><div className="mb-6"><h2 className="text-lg font-bold text-slate-900">Complete your profile</h2><p className="mt-1 text-sm text-slate-500">Only add information you are comfortable storing in your patient record.</p></div><div className="grid gap-5 sm:grid-cols-2"><Field label="Full name" name="name" value={form.name || user?.name || ''} onChange={updateForm} required /><Field label="Email" name="email" type="email" value={form.email || email} onChange={updateForm} required /><Field label="Phone number" name="phone" type="tel" value={form.phone} onChange={updateForm} /><Field label="Date of birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={updateForm} /><label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</span><select name="gender" value={form.gender} onChange={updateForm} className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"><option value="">Select gender</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label><Field label="Blood group" name="bloodGroup" value={form.bloodGroup} onChange={updateForm} /><label className="block sm:col-span-2"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Address</span><textarea name="address" rows="3" value={form.address} onChange={updateForm} className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label><Field label="Allergies" name="allergies" value={form.allergies} onChange={updateForm} /><Field label="Existing conditions" name="existingConditions" value={form.existingConditions} onChange={updateForm} /><Field label="Emergency contact name" name="emergencyContactName" value={form.emergencyContactName} onChange={updateForm} /><Field label="Emergency contact number" name="emergencyContactNumber" type="tel" value={form.emergencyContactNumber} onChange={updateForm} /></div><div className="mt-7 flex justify-end gap-3"><button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button></div></form> : <><section className="card"><h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="rounded-lg bg-sky-50 p-2 text-sky-600"><Icon>M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0</Icon></span>Personal Information</h2><div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{[['Full name', details.name || user?.name], ['Date of birth', details.dateOfBirth], ['Gender', details.gender], ['Phone number', details.phone], ['Email', email], ['Address', details.address]].map(([label, value]) => <div key={label}><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{display(value)}</p></div>)}</div></section><section className="card"><h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-slate-900"><span className="rounded-lg bg-teal-50 p-2 text-teal-600"><Icon>M12 3v18m9-9H3</Icon></span>Health Information</h2><div className="space-y-4">{[['Blood group', details.bloodGroup], ['Allergies', details.allergies], ['Existing conditions', details.existingConditions], ['Emergency contact', details.emergencyContactName && details.emergencyContactNumber ? `${details.emergencyContactName} · ${details.emergencyContactNumber}` : '']].map(([label, value]) => <div key={label} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{display(value)}</p></div>)}</div></section></>}
        {!editing && <section className="card lg:col-span-2"><div className="mb-5"><h2 className="text-lg font-bold text-slate-900">Healthcare Activity</h2><p className="mt-1 text-sm text-slate-500">Your appointments and reports will appear here as you use CureLink.</p></div><div className="grid gap-4 md:grid-cols-3"><Link to="/appointments" className="rounded-xl border border-slate-200 p-4 transition hover:border-sky-300 hover:bg-sky-50"><p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Appointments</p><p className="mt-3 font-semibold text-slate-900">{appointments.length ? `${appointments.length} appointment${appointments.length === 1 ? '' : 's'}` : 'No appointments yet'}</p><p className="mt-1 text-sm text-slate-500">{appointments.length ? 'View your appointment history.' : 'Your scheduled visits will appear here.'}</p></Link><Link to="/my-reports" className="rounded-xl border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50"><p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Medical reports</p><p className="mt-3 font-semibold text-slate-900">{reports.length ? `${reports.length} report${reports.length === 1 ? '' : 's'}` : 'No medical reports uploaded'}</p><p className="mt-1 text-sm text-slate-500">{reports.length ? 'Review your uploaded records.' : 'Your healthcare activity will appear here.'}</p></Link><div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Care timeline</p><p className="mt-3 font-semibold text-slate-900">{appointments.length || reports.length ? 'Activity available' : 'Nothing to show yet'}</p><p className="mt-1 text-sm text-slate-500">New care activity will be organized here.</p></div></div></section>}
      </div></div>
  </div>
}