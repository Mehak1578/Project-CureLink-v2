import React, { useContext } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const nav = [
  ['dashboard', 'Dashboard', '/admin/dashboard'],
  ['users', 'Users', '/admin/users'],
  ['doctors', 'Doctors', '/admin/doctors'],
  ['patients', 'Patients', '/admin/patients'],
  ['projects', 'Projects', '/projects'],
]

export default function AdminLayout({ children, error = '' }) {
  const { user, setUser } = useContext(AuthContext)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const section = pathname.startsWith('/projects')
    ? 'projects'
    : pathname.split('/')[2] || 'dashboard'

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  if (!user || user.role !== 'admin') return null

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
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}