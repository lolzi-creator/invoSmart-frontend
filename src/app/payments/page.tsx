'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { paymentAPI, invoiceAPI } from '@/lib/api'
import BottomNavbar from '@/components/BottomNavbar'

interface Payment {
  id: string
  amount: number
  valueDate: string
  reference?: string
  description?: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'MANUAL'
  isMatched: boolean
  invoiceId?: string
  invoice?: {
    id: string
    number: string
    customer?: {
      name: string
      company?: string
    }
  }
  importBatch?: string
  notes?: string
  createdAt: string
}

export default function PaymentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showMatchModal, setShowMatchModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched' | 'high' | 'medium' | 'low'>('all')
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [importType, setImportType] = useState<'csv' | 'mt940' | 'camt053' | null>(null)
  const [csvData, setCsvData] = useState('')
  const [importLoading, setImportLoading] = useState(false)

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

    loadData()
  }, [router])

  const loadData = async () => {
    try {
      setLoading(true)
      const [paymentsRes, invoicesRes] = await Promise.all([
        paymentAPI.getAll(),
        invoiceAPI.getInvoices()
      ])
      
      if (paymentsRes.success) {
        setPayments(paymentsRes.data.payments || [])
      }
      
      if (invoicesRes.success) {
        setInvoices(invoicesRes.data.invoices || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setNotification({ type: 'error', message: 'Failed to load payment data' })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount / 100) // Convert from Rappen to CHF
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-CH')
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'HIGH': return 'bg-green-100 text-green-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-orange-100 text-orange-800'
      case 'MANUAL': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFilteredPayments = () => {
    switch (filter) {
      case 'matched':
        return payments.filter(p => p.isMatched)
      case 'unmatched':
        return payments.filter(p => !p.isMatched)
      case 'high':
        return payments.filter(p => p.confidence === 'HIGH')
      case 'medium':
        return payments.filter(p => p.confidence === 'MEDIUM')
      case 'low':
        return payments.filter(p => p.confidence === 'LOW')
      default:
        return payments
    }
  }

  const handleManualMatch = (payment: Payment) => {
    setSelectedPayment(payment)
    setShowMatchModal(true)
  }

  const handleImportPayments = () => {
    setShowImportModal(true)
  }

  const handleImportTypeSelect = (type: 'csv' | 'mt940' | 'camt053') => {
    setImportType(type)
    setCsvData('')
  }

  const handleCsvImport = async () => {
    if (!csvData.trim()) {
      setNotification({ type: 'error', message: 'Please enter CSV data' })
      setTimeout(() => setNotification(null), 5000)
      return
    }

    try {
      setImportLoading(true)
      const response = await paymentAPI.importCSV(csvData)
      
      if (response.success) {
        setNotification({ 
          type: 'success', 
          message: `Successfully imported ${response.data.payments.length} payments` 
        })
        setTimeout(() => setNotification(null), 5000)
        setShowImportModal(false)
        setImportType(null)
        setCsvData('')
        loadData() // Reload data to show new payments
      } else {
        setNotification({ type: 'error', message: 'Failed to import payments' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      setNotification({ type: 'error', message: 'Failed to import payments' })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setImportLoading(false)
    }
  }

  const runAutoMatch = async () => {
    try {
      const response = await paymentAPI.runAutoMatch()
      if (response.success) {
        setNotification({ type: 'success', message: 'Auto-matching completed successfully' })
        setTimeout(() => setNotification(null), 5000)
        loadData() // Reload data to show updated matches
      } else {
        setNotification({ type: 'error', message: 'Auto-matching failed' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error) {
      console.error('Error running auto-match:', error)
      setNotification({ type: 'error', message: 'Auto-matching failed' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const getStats = () => {
    const totalPayments = payments.length
    const matchedPayments = payments.filter(p => p.isMatched).length
    const unmatchedPayments = totalPayments - matchedPayments
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const matchedAmount = payments.filter(p => p.isMatched).reduce((sum, p) => sum + p.amount, 0)

    return {
      totalPayments,
      matchedPayments,
      unmatchedPayments,
      totalAmount,
      matchedAmount
    }
  }

  const stats = getStats()

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

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Payment Management</h1>
          <p className="text-slate-600">Import, match, and manage payment data</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Payments</span>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : stats.totalPayments}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Matched</span>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : stats.matchedPayments}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Unmatched</span>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : stats.unmatchedPayments}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Amount</span>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : formatCurrency(stats.totalAmount)}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payment Management</h2>
              <p className="text-sm text-slate-600">Import, match, and manage payment data</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={runAutoMatch}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto Match
              </button>
              <button
                onClick={handleImportPayments}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Import Payments
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 mb-6 sm:mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Payments', count: payments.length },
              { key: 'matched', label: 'Matched', count: stats.matchedPayments },
              { key: 'unmatched', label: 'Unmatched', count: stats.unmatchedPayments },
              { key: 'high', label: 'High Confidence', count: payments.filter(p => p.confidence === 'HIGH').length },
              { key: 'medium', label: 'Medium Confidence', count: payments.filter(p => p.confidence === 'MEDIUM').length },
              { key: 'low', label: 'Low Confidence', count: payments.filter(p => p.confidence === 'LOW').length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                  filter === key
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Payments</h3>
          </div>
          
          {loading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : getFilteredPayments().length > 0 ? (
            <div className="divide-y divide-slate-200">
              {getFilteredPayments().map((payment) => (
                <div key={payment.id} className="p-4 sm:p-6 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900">
                          {formatCurrency(payment.amount)}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(payment.confidence)}`}>
                          {payment.confidence}
                        </span>
                        {payment.isMatched && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Matched
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 mb-1">
                        Date: {formatDate(payment.valueDate)}
                      </div>
                      {payment.reference && (
                        <div className="text-xs text-slate-500 mb-1">
                          Reference: {payment.reference}
                        </div>
                      )}
                      {payment.description && (
                        <div className="text-xs text-slate-500 mb-1">
                          Description: {payment.description}
                        </div>
                      )}
                      {payment.invoice && (
                        <div className="text-xs text-slate-500">
                          Invoice: {payment.invoice.number} - {payment.invoice.customer?.name}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {!payment.isMatched && (
                        <button
                          onClick={() => handleManualMatch(payment)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                        >
                          Match
                        </button>
                      )}
                      <button className="px-3 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition">
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No payments found</h3>
              <p className="text-slate-600 mb-6">Import payment data to get started</p>
              <button
                onClick={handleImportPayments}
                className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
              >
                Import Payments
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Import Payments</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Import Options</h3>
                <p className="text-sm text-blue-800 mb-3">Choose your import method:</p>
                <div className="space-y-2">
                  <div className="text-xs text-blue-700 font-mono bg-blue-100 p-2 rounded">
                    CSV: amount,valueDate,reference,description
                  </div>
                  <div className="text-xs text-blue-600">
                    <strong>Supported formats:</strong> CSV, MT940, CAMT.053
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button 
                  onClick={() => handleImportTypeSelect('csv')}
                  className={`p-4 border-2 border-dashed rounded-lg transition text-center ${
                    importType === 'csv' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-900">CSV Upload</p>
                  <p className="text-xs text-slate-500">Upload CSV file</p>
                </button>

                <button 
                  onClick={() => handleImportTypeSelect('mt940')}
                  className={`p-4 border-2 border-dashed rounded-lg transition text-center ${
                    importType === 'mt940' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-900">MT940</p>
                  <p className="text-xs text-slate-500">Bank statement</p>
                </button>

                <button 
                  onClick={() => handleImportTypeSelect('camt053')}
                  className={`p-4 border-2 border-dashed rounded-lg transition text-center ${
                    importType === 'camt053' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-slate-900">CAMT.053</p>
                  <p className="text-xs text-slate-500">ISO 20022 format</p>
                </button>
              </div>

              {/* CSV Import Form */}
              {importType === 'csv' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      CSV Data
                    </label>
                    <textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="amount,valueDate,reference,description&#10;118.00,2025-01-15,RE-2025-0001,Payment for invoice&#10;250.50,2025-01-16,RE-2025-0002,Another payment"
                      className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Format: amount,valueDate,reference,description (one payment per line)
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Sample CSV Data:</h4>
                    <pre className="text-xs text-blue-800 font-mono whitespace-pre-wrap">
{`amount,valueDate,reference,description
118.00,2025-01-15,RE-2025-0001,Payment for invoice
250.50,2025-01-16,RE-2025-0002,Another payment
75.25,2025-01-17,RE-2025-0003,Third payment`}
                    </pre>
                  </div>
                </div>
              )}

              {/* MT940 Import Form */}
              {importType === 'mt940' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      MT940 Data
                    </label>
                    <textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste your MT940 bank statement data here..."
                      className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Paste your MT940 bank statement data
                    </p>
                  </div>
                </div>
              )}

              {/* CAMT.053 Import Form */}
              {importType === 'camt053' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      CAMT.053 Data
                    </label>
                    <textarea
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste your CAMT.053 XML data here..."
                      className="w-full h-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Paste your CAMT.053 XML data
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportType(null)
                    setCsvData('')
                  }}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                {importType && (
                  <button
                    onClick={handleCsvImport}
                    disabled={importLoading || !csvData.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {importLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Importing...
                      </>
                    ) : (
                      'Import'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Match Modal */}
      {showMatchModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Manual Payment Match</h2>
              <button
                onClick={() => setShowMatchModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-semibold text-slate-900 mb-2">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Amount:</span>
                    <span className="ml-2 font-medium">{formatCurrency(selectedPayment.amount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Date:</span>
                    <span className="ml-2 font-medium">{formatDate(selectedPayment.valueDate)}</span>
                  </div>
                  {selectedPayment.reference && (
                    <div className="col-span-2">
                      <span className="text-slate-600">Reference:</span>
                      <span className="ml-2 font-medium">{selectedPayment.reference}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Select Invoice to Match</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {invoices.filter(inv => !inv.isPaid).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{invoice.number}</div>
                          <div className="text-sm text-slate-600">{invoice.customer?.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-900">{formatCurrency(invoice.total)}</div>
                          <div className="text-sm text-slate-600">Due: {formatDate(invoice.dueDate)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowMatchModal(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  Match Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  )
}