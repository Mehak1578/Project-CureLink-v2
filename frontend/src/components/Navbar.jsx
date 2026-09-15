import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Navbar() {
  const { user, setUser } = useContext(AuthContext)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)
  const displayName = user?.name || 'dnnu'
  const initials = displayName.slice(0, 2).toUpperCase()

  useEffect(() => {
    const closeOnOutsideClick = event => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setProfileOpen(false)
    navigate('/login')
  }

  const logoTo = user?.role === 'admin' ? '/admin/dashboard'
                 : user?.role === 'doctor' ? '/doctor/dashboard'
                 : '/'

  const getNavLinks = () => {
    if (!user) {
      return [
        { to: '/', label: 'Home' },
        { to: '/doctors', label: 'Doctors' }
      ]
    }
    if (user.role === 'admin') {
      return [
        { to: '/admin/dashboard', label: 'Admin Panel' }
      ]
    }
    if (user.role === 'doctor') {
      return [
        { to: '/doctor/dashboard', label: 'Dashboard' },
        { to: '/doctor/appointments', label: 'Appointments' },
        { to: '/doctor/patients', label: 'Patients' },
        { to: '/doctor/availability', label: 'Availability' }
      ]
    }
    return [
      { to: '/', label: 'Home' },
      { to: '/doctors', label: 'Doctors' },
      { to: '/appointments', label: 'Appointments' },
      { to: '/my-reports', label: 'Reports' }
    ]
  }

  const getMenuItems = () => {
    if (!user) return []
    if (user.role === 'admin') {
      return [
        { label: 'Admin Dashboard', to: '/admin/dashboard', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0' },
        { label: 'Account Settings', to: '/settings', icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z' }
      ]
    }
    if (user.role === 'doctor') {
      return [
        { label: 'View Profile', to: '/doctor/profile', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0' },
        { label: 'Account Settings', to: '/settings', icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z' }
      ]
    }
    return [
      { label: 'View Profile', to: '/profile', icon: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21a7 7 0 0 1 14 0' },
      { label: 'My Appointments', to: '/appointments', icon: 'M8 7V3m8 4V3m-9 8h10m-9 8h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2' },
      { label: 'Medical Records', to: '/my-reports', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6L19 7.4V19a2 2 0 0 1-2 2' },
      { label: 'Account Settings', to: '/settings', icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.2h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L8 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z' }
    ]
  }

  const isActive = to => to === '/' ? pathname === '/' : pathname.startsWith(to)
  const navLinks = getNavLinks()
  const menuItems = getMenuItems()

  return <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white">
    <div className="container-max"><div className="flex h-16 items-center justify-between">
      <Link to={logoTo} className="flex flex-shrink-0 items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0Z" /></svg></div><span className="text-lg font-bold tracking-tight text-sky-700">CureLink</span></Link>
      <div className="hidden items-center gap-1 md:flex">{navLinks.map(({ to, label }) => <Link key={to} to={to} className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${isActive(to) ? 'bg-sky-50 text-sky-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{label}</Link>)}</div>
      <div className="flex items-center gap-3">{user ? <div className="relative" ref={profileRef}>
        <button type="button" aria-expanded={profileOpen} aria-haspopup="menu" aria-label="Open profile menu" onClick={() => setProfileOpen(open => !open)} className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-500"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white ring-4 ring-sky-50">{initials}</div><span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 sm:block">{displayName}</span><svg className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${profileOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" /></svg></button>
        <div className={`profile-menu absolute right-0 top-full z-50 mt-3 w-[min(19rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-sky-100 bg-white p-2 shadow-xl ${profileOpen ? 'profile-menu-open' : ''}`} role="menu" aria-hidden={!profileOpen}>
          <div className="rounded-xl border-b border-slate-100 bg-sky-50/70 px-3 py-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{displayName}</p><p className="truncate text-xs text-slate-500">{user.email || 'Email not provided'}</p></div></div></div>
          <div className="mt-2 space-y-0.5">{menuItems.map(({ label, to, icon }) => <Link key={label} to={to} role="menuitem" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-sky-50 hover:text-sky-700"><svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} /></svg>{label}</Link>)}</div>
          <div className="mt-2 border-t border-slate-100 pt-2"><button type="button" role="menuitem" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4m-5-4 5-5m0 0-5-5m5 5H3" /></svg>Logout</button></div>
        </div>
      </div> : <><Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link><Link to="/register" className="btn btn-primary btn-sm">Get started</Link></>}</div>
    </div></div>
  </nav>
}