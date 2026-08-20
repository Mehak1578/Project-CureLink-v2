import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

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

export default function Dashboard() {
  const { user } = useContext(AuthContext)

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
