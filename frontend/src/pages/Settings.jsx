import React, { useContext, useEffect, useState } from 'react'
import axios from '../api'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const sections = [
  ['account', 'Account', 'M16 7a4 4 0 1 1-8 0M5 21a7 7 0 0 1 14 0'],
  ['security', 'Security', 'M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4'],
  ['privacy', 'Privacy & Data', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
]

const Icon = ({ children, className = 'h-5 w-5' }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={children} /></svg>
const Card = ({ id, title, description, children }) => <section id={id} className="card scroll-mt-24"><div className="mb-6"><h2 className="text-lg font-bold text-slate-900">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}</div>{children}</section>
const Field = ({ label, name, type = 'text', value, onChange }) => <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><input name={name} type={type} value={value || ''} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>
const PasswordField = ({ label, name, autoComplete, value, onChange, visible, onToggle, disabled }) => <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span><span className="relative block"><input required name={name} autoComplete={autoComplete} disabled={disabled} type={visible ? 'text' : 'password'} value={value} onChange={onChange} className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 pr-11 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50" /><button type="button" disabled={disabled} onClick={onToggle} aria-label={visible ? `Hide ${label}` : `Show ${label}`} className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-sky-600 disabled:cursor-not-allowed"><Icon className="h-4 w-4">{visible ? 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Zm10 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' : 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.3 18.3 0 0 1-3.1 4.1M6.2 6.2C3.9 7.7 2 12 2 12s3.5 7 10 7c1 0 1.9-.2 2.8-.5'}</Icon></button></span></label>

export default function Settings() {
  const { user, setUser } = useContext(AuthContext)
  const navigate = useNavigate()
  const [active, setActive] = useState('account')
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visiblePasswords, setVisiblePasswords] = useState({ current: false, new: false, confirm: false })
    const passwordStrength = password => { if (!password) return null; const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password); const hasNumber = /\d/.test(password); const hasSymbol = /[^A-Za-z0-9]/.test(password); const score = Number(password.length >= 8) + Number(hasMixedCase) + Number(hasNumber || hasSymbol); return score >= 3 ? 'Strong' : score >= 2 ? 'Medium' : 'Weak' }
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    axios.get('/api/auth/profile').then(({ data }) => {
      setForm({ name: data.name || '', email: data.email || '' })
      setUser(current => ({ ...current, ...data }))
    }).catch(requestError => setError(requestError.response?.data?.msg || 'Could not load account settings.'))
  }, [])

  const message = (text) => { setNotice(text); setError(''); window.setTimeout(() => setNotice(''), 3500) }
  const goTo = id => { setActive(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const updateForm = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const saveAccount = async event => {
    event.preventDefault(); setSaving(true); setNotice(''); setError('')
    try { const { data } = await axios.put('/api/auth/profile', { ...form }); setUser(current => ({ ...current, ...data })); message('Account information saved.') } catch (requestError) { setError(requestError.response?.data?.msg || 'Could not save account information.') } finally { setSaving(false) }
  }
  const changePassword = async event => {
    event.preventDefault(); setNotice(''); setError('')
    if (!currentPassword) return setError('Current password is required.')
    if (!newPassword) return setError('New password is required.')
    if (newPassword.length < 8) return setError('New password must be at least 8 characters.')
    if (newPassword !== confirmPassword) return setError('Passwords do not match.')
    setSaving(true)
    try { await axios.put('/api/auth/change-password', { currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); message('Your password has been changed successfully.') } catch (requestError) { setError(requestError.response?.data?.msg || 'Unable to change your password right now. Please try again.') } finally { setSaving(false) }
  }
  const deleteAccount = async () => {
    if (deleteText !== 'DELETE') return setError('Type DELETE to confirm account deletion.')
    setSaving(true); setError('')
    try { await axios.delete('/api/auth/account', { data: { confirmation: deleteText } }); localStorage.removeItem('token'); setUser(null); navigate('/login') } catch (requestError) { setError(requestError.response?.data?.msg || 'Could not delete your account.'); setDeleteOpen(false) } finally { setSaving(false) }
  }

  if (!user) return <div className="page-loading"><span>Please sign in to manage your account.</span></div>
  const patientId = user.id || user._id || ''
  return <div className="page-shell"><div className="page-header"><div className="container-max"><p className="text-sm font-semibold text-sky-600">Patient portal</p><h1 className="page-title mt-1">Account Settings</h1><p className="page-subtitle">Manage your CureLink account and security.</p></div></div><div className="container-max py-8"><div className="mb-5 min-h-6">{notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">{notice}</div>}{error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</div>}</div><div className="grid gap-8 lg:grid-cols-[13rem_1fr]"><aside className="lg:sticky lg:top-24 lg:h-fit"><nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 lg:block lg:space-y-1">{sections.map(([id, label, path]) => <button key={id} type="button" onClick={() => goTo(id)} className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition lg:w-full ${active === id ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4">{path}</Icon>{label}</button>)}</nav></aside><main className="space-y-6">
    <Card id="account" title="Account Information" description="Your registered account identity."><form onSubmit={saveAccount}><div className="grid gap-5 sm:grid-cols-2"><Field label="Account name / username" name="name" value={form.name} onChange={updateForm} /><Field label="Registered email" name="email" type="email" value={form.email} onChange={updateForm} /><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient ID</p><p className="mt-1 text-sm font-medium text-slate-700">{patientId || <span className="italic text-slate-400">Not assigned</span>}</p></div></div><button type="submit" disabled={saving} className="btn btn-primary mt-5">{saving ? 'Saving...' : 'Save Changes'}</button></form></Card>
    <Card id="security" title="Security" description="Use a strong password to help protect your healthcare information and account."><form onSubmit={changePassword} className="max-w-xl"><p className="mb-4 text-sm font-semibold text-slate-800">Change Password</p><div className="grid gap-4 sm:grid-cols-2"><PasswordField label="Current Password" name="currentPassword" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} visible={visiblePasswords.current} onToggle={() => setVisiblePasswords(current => ({ ...current, current: !current.current }))} disabled={saving} /><PasswordField label="New Password" name="newPassword" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} visible={visiblePasswords.new} onToggle={() => setVisiblePasswords(current => ({ ...current, new: !current.new }))} disabled={saving} /><PasswordField label="Confirm New Password" name="confirmPassword" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} visible={visiblePasswords.confirm} onToggle={() => setVisiblePasswords(current => ({ ...current, confirm: !current.confirm }))} disabled={saving} /></div><div className="mt-3 flex items-center justify-between gap-3 text-xs"><span className="text-slate-500">At least 8 characters</span>{passwordStrength(newPassword) && <span className={`font-semibold ${passwordStrength(newPassword) === 'Strong' ? 'text-emerald-600' : passwordStrength(newPassword) === 'Medium' ? 'text-amber-600' : 'text-red-600'}`}>Password strength: {passwordStrength(newPassword)}</span>}</div><button type="submit" disabled={saving} className="btn btn-primary mt-5">{saving ? 'Changing Password...' : 'Change Password'}</button></form></Card>
    <Card id="privacy" title="Privacy & Data" description="Review how CureLink handles your patient account data."><button type="button" onClick={() => setShowPrivacy(true)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50"><span><span className="block font-semibold text-slate-800">Privacy Policy</span><span className="mt-1 block text-sm text-slate-500">Learn how account and healthcare data is used.</span></span><Icon className="h-5 w-5 text-sky-600">m9 18 6-6-6-6</Icon></button></Card>
    <section className="rounded-xl border border-red-200 bg-red-50/60 p-6"><h2 className="text-lg font-bold text-red-900">Danger Zone</h2><p className="mt-1 text-sm text-red-700">Permanently delete your CureLink account and associated access.</p><button type="button" onClick={() => { setDeleteText(''); setDeleteOpen(true) }} className="btn mt-5 bg-red-600 text-white hover:bg-red-700">Delete Account</button></section>
    </main></div></div>
    {showPrivacy && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">CureLink Privacy Policy</h2><p className="mt-1 text-sm text-slate-500">How this patient portal uses your information.</p></div><button type="button" onClick={() => setShowPrivacy(false)} aria-label="Close privacy policy" className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button></div><div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-600"><p>CureLink uses your account information to authenticate you and provide appointments, medical records, and related patient services.</p><p>Your profile details are stored with your account so they can be shown to you and used for healthcare workflows you initiate.</p><p>CureLink does not display your password in the application or include it in account data responses.</p></div><button type="button" onClick={() => setShowPrivacy(false)} className="btn btn-primary mt-6">Close</button></div></div>}
    {deleteOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold text-slate-900">Delete your account?</h2><p className="mt-3 text-sm leading-relaxed text-slate-600">This permanently deletes your CureLink account. This action cannot be undone and you will be signed out after successful deletion.</p><label className="mt-5 block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Type DELETE to confirm</span><input value={deleteText} onChange={event => setDeleteText(event.target.value)} autoComplete="off" className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm uppercase outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleteOpen(false)} className="btn btn-secondary">Cancel</button><button type="button" disabled={saving || deleteText !== 'DELETE'} onClick={deleteAccount} className="btn bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Deleting...' : 'Delete permanently'}</button></div></div></div>}
  </div>
}