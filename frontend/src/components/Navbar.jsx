import React, { useContext, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

export default function Navbar() {
  const { user, setUser } = useContext(AuthContext)
  const { pathname } = useLocation()
  const logout = () => { localStorage.removeItem('token'); setUser(null) }

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/doctors', label: 'Doctors' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/my-reports', label: 'Reports' },
  ]

  const isActive = (to) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to)

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container-max">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center">
              <svg className="w-4.5 h-4.5 text-white w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-sky-700 tracking-tight">CureLink</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700 max-w-[120px] truncate">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 hover:text-red-600"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
              </>
            )}
          </div>

        </div>
      </div>
    </nav>
  )
}
