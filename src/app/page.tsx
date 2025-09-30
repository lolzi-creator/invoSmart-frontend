'use client'

import { useState } from 'react'
import { authAPI } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LandingPage() {
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await authAPI.login(loginData)
      if (response.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        localStorage.setItem('company', JSON.stringify(response.data.company))
        router.push('/dashboard')
      } else {
        setError(response.error || 'Login failed')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        
        {/* Logo & Branding */}
        <div className="text-center mb-12">
          <div className="mb-6 flex justify-center">
            <Image 
              src="/invoSmart_logo.png" 
              alt="InvoSmart" 
              width={200} 
              height={200}
              className="drop-shadow-2xl"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-white">Invo</span>
            <span className="text-[#10B981]">Smart</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Smart Finance Management for Swiss Businesses
          </p>
          <p className="text-slate-400 mt-2">
            Invoicing • Payments • Expenses • Reports
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden">
            
            {!showLogin ? (
              /* Get Started View */
              <div className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 text-center mb-6">
                  Welcome to InvoSmart
                </h2>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Swiss QR Invoices</h3>
                      <p className="text-sm text-slate-600">Compliant with Swiss payment standards</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Automatic Matching</h3>
                      <p className="text-sm text-slate-600">Import bank statements, auto-match payments</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">Financial Overview</h3>
                      <p className="text-sm text-slate-600">Track income, expenses, and cash flow</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/register')}
                  className="w-full bg-[#10B981] text-white font-semibold py-4 rounded-xl hover:bg-[#059669] transition-all transform hover:scale-[1.02] shadow-lg mb-4"
                >
                  Get Started - Free Trial
                </button>

                <button
                  onClick={() => setShowLogin(true)}
                  className="w-full bg-slate-100 text-slate-900 font-semibold py-4 rounded-xl hover:bg-slate-200 transition-all"
                >
                  Sign In
                </button>
              </div>
            ) : (
              /* Login View */
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
                  <button
                    onClick={() => {
                      setShowLogin(false)
                      setError('')
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                      placeholder="your@email.ch"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#10B981] text-white font-semibold py-3 rounded-lg hover:bg-[#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>

                  <div className="text-center pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600">
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/register')}
                        className="text-[#10B981] font-semibold hover:text-[#059669]"
                      >
                        Get Started
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Features Footer */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-center">
          <div>
            <div className="text-[#10B981] text-3xl font-bold mb-2">100%</div>
            <div className="text-slate-300">Swiss Compliant</div>
          </div>
          <div>
            <div className="text-[#10B981] text-3xl font-bold mb-2">5 min</div>
            <div className="text-slate-300">Setup Time</div>
          </div>
          <div>
            <div className="text-[#10B981] text-3xl font-bold mb-2">24/7</div>
            <div className="text-slate-300">Available</div>
          </div>
        </div>
      </div>
    </div>
  )
}