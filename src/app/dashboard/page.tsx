'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { invoiceAPI, customerAPI, paymentAPI } from '@/lib/api'
import BottomNavbar from '@/components/BottomNavbar'

interface DashboardStats {
  totalOutstanding: number
  overdueCount: number
  thisMonthRevenue: number
  totalCustomers: number
  recentInvoices: any[]
  recentPayments: any[]
  upcomingDue: any[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalOutstanding: 0,
    overdueCount: 0,
    thisMonthRevenue: 0,
    totalCustomers: 0,
    recentInvoices: [],
    recentPayments: [],
    upcomingDue: []
  })
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [customers, setCustomers] = useState<Array<any>>([])
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unit: 'Stk', price: 0, discount: 0, vatRate: 7.7 }],
    notes: ''
  })

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load invoices, customers, and payments in parallel
      const [invoicesRes, customersRes, paymentsRes] = await Promise.all([
        invoiceAPI.getInvoices(),
        customerAPI.getCustomers(),
        paymentAPI.getPayments()
      ])

      const invoices = invoicesRes.success ? invoicesRes.data : []
      const customersData = customersRes.success ? customersRes.data : []
      const payments = paymentsRes.success ? paymentsRes.data : []

      setCustomers(customersData)

      // Calculate stats
      const now = new Date()
      const thisMonth = now.getMonth()
      const thisYear = now.getFullYear()

      const totalOutstanding = invoices
        .filter((inv: any) => inv.status === 'open' || inv.status === 'teilbezahlt')
        .reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

      const overdueCount = invoices.filter((inv: any) => {
        if (inv.status === 'bezahlt') return false
        const dueDate = new Date(inv.dueDate)
        return dueDate < now
      }).length

      const thisMonthRevenue = invoices
        .filter((inv: any) => {
          const invDate = new Date(inv.invoiceDate)
          return inv.status === 'bezahlt' && 
                 invDate.getMonth() === thisMonth && 
                 invDate.getFullYear() === thisYear
        })
        .reduce((sum: number, inv: any) => sum + (inv.totalAmount || 0), 0)

      const recentInvoices = invoices
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)

      const recentPayments = payments
        .sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
        .slice(0, 5)

      const upcomingDue = invoices
        .filter((inv: any) => {
          if (inv.status === 'bezahlt') return false
          const dueDate = new Date(inv.dueDate)
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return daysUntilDue >= 0 && daysUntilDue <= 7
        })
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5)

      setStats({
        totalOutstanding,
        overdueCount,
        thisMonthRevenue,
        totalCustomers: customers.length,
        recentInvoices,
        recentPayments,
        upcomingDue
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/')
      return
    }

    const userData = localStorage.getItem('user')
    const companyData = localStorage.getItem('company')
    
    if (userData) setUser(JSON.parse(userData))
    if (companyData) setCompany(JSON.parse(companyData))

    loadDashboardData()
  }, [router, loadDashboardData])

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bezahlt': return 'text-green-600 bg-green-100'
      case 'teilbezahlt': return 'text-yellow-600 bg-yellow-100'
      case 'open': return 'text-blue-600 bg-blue-100'
      case 'overdue': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const handleCreateInvoice = async () => {
    try {
      // Transform data to match API expectations
      const invoiceData = {
        customerId: newInvoice.customerId,
        date: newInvoice.invoiceDate,
        dueDate: newInvoice.dueDate,
        items: newInvoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.price,
          discount: item.discount,
          vatRate: item.vatRate
        })),
        notes: newInvoice.notes
      }
      
      const response = await invoiceAPI.createInvoice(invoiceData)
      if (response.success) {
        setShowCreateModal(false)
        setNewInvoice({
          customerId: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ description: '', quantity: 1, unit: 'Stk', price: 0, discount: 0, vatRate: 7.7 }],
          notes: ''
        })
        loadDashboardData()
      }
    } catch (error) {
      console.error('Error creating invoice:', error)
    }
  }

  const addItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, { description: '', quantity: 1, unit: 'Stk', price: 0, discount: 0, vatRate: 7.7 }]
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newInvoice.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setNewInvoice({ ...newInvoice, items: updatedItems })
  }

  const removeItem = (index: number) => {
    if (newInvoice.items.length > 1) {
      const updatedItems = newInvoice.items.filter((_, i) => i !== index)
      setNewInvoice({ ...newInvoice, items: updatedItems })
    }
  }

  if (!user || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 mb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="relative">
                <Image 
                  src="/invoSmart_logo.png" 
                  alt="InvoSmart" 
                  width={120} 
                  height={120} 
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                <p className="text-xs text-slate-400 truncate max-w-xs lg:max-w-sm">{company.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition text-sm"
              >
                <span className="hidden sm:inline">Logout</span>
                <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {user.name?.split(' ')[0]}! 👋
          </h2>
          <p className="text-slate-600">Here&apos;s what&apos;s happening with your business today</p>
        </div>

        {/* Smart Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Create Invoice - Primary Action */}
          <div 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl p-6 text-white cursor-pointer hover:scale-105 transition-transform shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Quick</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Create Invoice</h3>
            <p className="text-green-100 text-sm">Start billing your clients instantly</p>
          </div>

          {/* Import Payments - Smart Action */}
          <div 
            onClick={() => router.push('/payments')}
            className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white cursor-pointer hover:scale-105 transition-transform shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Auto</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Import Payments</h3>
            <p className="text-blue-100 text-sm">Auto-match bank payments to invoices</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Outstanding</span>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {loading ? '...' : formatCurrency(stats.totalOutstanding)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Unpaid invoices</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Overdue</span>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {loading ? '...' : stats.overdueCount}
            </div>
            <div className="text-xs text-slate-500 mt-1">Need attention</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">This Month</span>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {loading ? '...' : formatCurrency(stats.thisMonthRevenue)}
            </div>
            <div className="text-xs text-slate-500 mt-1">Revenue</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Customers</span>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {loading ? '...' : stats.totalCustomers}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total clients</div>
          </div>
        </div>

        {/* Financial Overview Chart */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 mb-6 sm:mb-8">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Financial Overview</h3>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">Chart coming soon</p>
              <p className="text-slate-400 text-xs">Income, Expenses & Outstanding</p>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Recent Invoices */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg font-bold text-slate-900">Recent Invoices</h3>
              <button
                onClick={() => router.push('/invoices')}
                className="text-sm text-[#10B981] hover:text-[#059669] font-medium"
              >
                View all
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : stats.recentInvoices.length > 0 ? (
              <div className="space-y-3">
                {stats.recentInvoices.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        #{invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {invoice.customer?.name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(invoice.totalAmount || 0)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">No invoices yet</p>
                <button
                  onClick={() => router.push('/invoices')}
                  className="mt-2 text-[#10B981] hover:text-[#059669] text-sm font-medium"
                >
                  Create your first invoice
                </button>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg font-bold text-slate-900">Recent Payments</h3>
              <button
                onClick={() => router.push('/payments')}
                className="text-sm text-[#10B981] hover:text-[#059669] font-medium"
              >
                View all
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : stats.recentPayments && stats.recentPayments.length > 0 ? (
              <div className="space-y-3">
                {stats.recentPayments.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {formatCurrency(payment.amount / 100)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {payment.reference || 'No reference'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.confidence === 'HIGH' ? 'text-green-600 bg-green-100' :
                        payment.confidence === 'MEDIUM' ? 'text-yellow-600 bg-yellow-100' :
                        payment.confidence === 'LOW' ? 'text-orange-600 bg-orange-100' :
                        'text-gray-600 bg-gray-100'
                      }`}>
                        {payment.confidence}
                      </span>
                      <div className="text-xs text-slate-500">
                        {new Date(payment.paymentDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm">No payments yet</p>
                <button
                  onClick={() => router.push('/payments')}
                  className="mt-2 text-[#10B981] hover:text-[#059669] text-sm font-medium"
                >
                  Import your first payment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Due Dates */}
        {stats.upcomingDue.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg font-bold text-slate-900">Upcoming Due Dates</h3>
              <span className="text-sm text-slate-500">Next 7 days</span>
            </div>
            <div className="space-y-3">
              {stats.upcomingDue.map((invoice: any) => {
                const dueDate = new Date(invoice.dueDate)
                const daysUntilDue = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        #{invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {invoice.customer?.name || 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(invoice.totalAmount || 0)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        daysUntilDue === 0 ? 'text-red-600 bg-red-100' : 
                        daysUntilDue <= 2 ? 'text-orange-600 bg-orange-100' : 
                        'text-blue-600 bg-blue-100'
                      }`}>
                        {daysUntilDue === 0 ? 'Due today' : 
                         daysUntilDue === 1 ? 'Due tomorrow' : 
                         `Due in ${daysUntilDue} days`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Create New Invoice</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateInvoice(); }} className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer *</label>
                <select
                  value={newInvoice.customerId}
                  onChange={(e) => setNewInvoice({ ...newInvoice, customerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer: any) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.company && `(${customer.company})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Date *</label>
                  <input
                    type="date"
                    value={newInvoice.invoiceDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Invoice Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="px-3 py-1 bg-blue-100 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-200 transition"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Stk">Stk</option>
                          <option value="Std">Std</option>
                          <option value="Tag">Tag</option>
                          <option value="Monat">Monat</option>
                          <option value="Jahr">Jahr</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Price (CHF)</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-end space-x-1">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={newInvoice.items.length === 1}
                          className="px-2 py-1 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes for the invoice"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile Only */}
      <BottomNavbar />
    </div>
  )
}
