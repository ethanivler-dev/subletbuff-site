'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  DollarSign, EyeOff, ShieldAlert,
  LayoutDashboard, ShieldCheck, FileText, BarChart3, Settings, Search,
  ArrowRight, CheckCircle2,
} from 'lucide-react'

export default function LandlordsPage() {
  const [form, setForm] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    unit_count: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/landlord-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please email us at subletbuff@gmail.com.')
    } finally {
      setSubmitting(false)
    }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      {/* ─── Hero ─── */}
      <section className="relative bg-gray-900 pt-28 pb-20 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/90 via-gray-900 to-green-900/80" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Stop Losing Money on Empty Summer Units
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            SubletBuff helps Boulder landlords fill summer vacancies with verified, approved subtenants. You stay in control.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => scrollTo('contact')}
              className="px-8 py-3.5 text-base font-semibold rounded-button bg-accent-500 text-gray-900 hover:bg-accent-600 transition-colors"
            >
              Get Started Free
            </button>
            <button
              onClick={() => scrollTo('how-it-works')}
              className="px-8 py-3.5 text-base font-medium rounded-button bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              See How It Works
            </button>
          </div>
        </div>
      </section>

      {/* ─── Problem ─── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-4">
            Your Tenants Are Already Subletting
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-2xl mx-auto">
            You just don&apos;t know about it.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                icon: DollarSign,
                title: 'Lost Revenue',
                text: 'Empty units May through August cost you thousands in lost rent while tenants sublet through Facebook and keep the money.',
              },
              {
                icon: EyeOff,
                title: 'Zero Visibility',
                text: 'Unauthorized subtenants mean unscreened people in your property. No background checks. No lease agreement. No control.',
              },
              {
                icon: ShieldAlert,
                title: 'Liability Risk',
                text: "When something goes wrong with an unauthorized subtenant, you're still on the hook. Protect yourself.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-gray-50 rounded-card p-6 border border-gray-100"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
                  <card.icon className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-gray-50 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            How SubletBuff Works for Landlords
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Your Tenant Requests to Sublet',
                text: 'When your tenant wants to sublet for the summer, they submit a request through SubletBuff instead of posting on Facebook.',
              },
              {
                step: 2,
                title: 'You Review & Approve',
                text: "See the subtenant's profile, ID verification status, and proposed dates. Approve or reject from your dashboard with one click.",
              },
              {
                step: 3,
                title: "Everyone's Protected",
                text: 'A sublease agreement is auto-generated with your rules built in. You maintain full visibility throughout.',
              },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {s.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            Built for Property Managers
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: LayoutDashboard, title: 'Approval Dashboard', text: 'Review and manage all sublet requests in one place.' },
              { icon: ShieldCheck, title: 'Verified Subtenants', text: 'Every user is ID-verified. No anonymous strangers in your units.' },
              { icon: FileText, title: 'Auto Sublease Agreements', text: 'Colorado-compliant agreements generated automatically with your rules.' },
              { icon: BarChart3, title: 'Occupancy Analytics', text: 'Track summer occupancy, average sublet pricing, and demand trends.' },
              { icon: Settings, title: 'Custom Rules', text: 'Set pet policies, noise rules, parking restrictions per property.' },
              { icon: Search, title: 'Background Checks', text: 'Optional background checks. Applicant-paid. Results shared with you.' },
            ].map((feat) => (
              <div
                key={feat.title}
                className="flex items-start gap-4 p-5 rounded-card border border-gray-100 hover:shadow-card transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <feat.icon className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feat.title}</h3>
                  <p className="text-sm text-gray-500">{feat.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-xl sm:text-2xl text-gray-700 font-serif italic mb-6 leading-relaxed">
            &ldquo;SubletBuff gave us visibility into summer subletting that we never had before. Instead of students going behind our backs, we now approve every subtenant.&rdquo;
          </blockquote>
          <p className="text-sm text-gray-500 mb-12">&mdash; Boulder Property Manager</p>
          <div className="grid grid-cols-3 gap-6">
            {[
              { stat: '50+', label: 'Verified Listings' },
              { stat: '10+', label: 'Property Partners' },
              { stat: '$0', label: 'To Get Started' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-3xl sm:text-4xl font-bold text-primary-600">{s.stat}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 mb-12">
            Simple, Transparent Pricing
          </h2>
          <div className="bg-gradient-to-b from-primary-50 to-white rounded-card border-2 border-primary-200 p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold mb-4">
              LIMITED SPOTS
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Pilot Program</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We&apos;re onboarding our first group of Boulder property managers at no cost. Full access to the landlord dashboard, approval tools, and sublease agreements.
            </p>
            <button
              onClick={() => scrollTo('contact')}
              className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Apply for Free Pilot
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-gray-400 mt-4">No credit card required. No commitment.</p>
          </div>
        </div>
      </section>

      {/* ─── Contact Form ─── */}
      <section id="contact" className="py-20 px-4 sm:px-6 bg-gray-50 scroll-mt-20">
        <div className="max-w-xl mx-auto">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-2">
            Get Started with SubletBuff
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Fill out the form below and we&apos;ll reach out within 24 hours.
          </p>

          {submitted ? (
            <div className="bg-white rounded-card shadow-card p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Thanks for your interest!</h3>
              <p className="text-gray-600">
                We&apos;ll reach out within 24 hours to set up your free pilot.
              </p>
              <Link href="/" className="inline-block mt-6 text-primary-600 font-medium hover:underline">
                Back to SubletBuff
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-card p-8 flex flex-col gap-5">
              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-button">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Company / Property Management Name</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => update('company', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Number of Units Managed</label>
                <select
                  value={form.unit_count}
                  onChange={(e) => update('unit_count', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-100">51-100</option>
                  <option value="100+">100+</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-800">Message</label>
                <textarea
                  rows={4}
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Tell us about your properties"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 text-base font-semibold rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Request Access'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  )
}
