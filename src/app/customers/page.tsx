'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { customerAPI, invoiceAPI } from '@/lib/api'
import BottomNavbar from '@/components/BottomNavbar'

export default function CustomersPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [customers, setCustomers] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [customerInvoices, setCustomerInvoices] = useState<Array<any>>([])
  const [activeTab, setActiveTab] = useState<'info' | 'invoices'>('info')
  const [csvData, setCsvData] = useState('')
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    company: '',
    address: '',
    zip: '',
    city: '',
    country: 'CH',
    email: '',
    phone: '',
    vatNumber: '',
    paymentTerms: 30,
    language: 'de',
    notes: ''
  })

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
      console.log('Loading customers...')
      const customersRes = await customerAPI.getCustomers()
      console.log('Customers API response:', customersRes)
      console.log('Response success:', customersRes.success)
      console.log('Response data type:', typeof customersRes.data)
      console.log('Response data is array:', Array.isArray(customersRes.data))
      console.log('Response data length:', customersRes.data?.length)
      
      if (customersRes.success && Array.isArray(customersRes.data?.customers)) {
        console.log('Setting customers:', customersRes.data.customers)
        setCustomers(customersRes.data.customers)
      } else {
        console.error('Invalid customers data:', customersRes)
        setCustomers([])
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  const handleViewCustomer = async (customer: any) => {
    setSelectedCustomer(customer)
    setActiveTab('info')
    setShowViewModal(true)
    
    // Load customer invoices
    try {
      const response = await invoiceAPI.getInvoices()
      if (response.success) {
        const customerInvoices = response.data.invoices.filter((invoice: any) => 
          invoice.customerId === customer.id
        )
        setCustomerInvoices(customerInvoices)
      }
    } catch (error) {
      console.error('Error loading customer invoices:', error)
      setCustomerInvoices([])
    }
  }

  const handleEditCustomer = (customer: any) => {
    setSelectedCustomer(customer)
    setNewCustomer({
      name: customer.name || '',
      company: customer.company || '',
      address: customer.address || '',
      zip: customer.zip || '',
      city: customer.city || '',
      country: customer.country || 'CH',
      email: customer.email || '',
      phone: customer.phone || '',
      vatNumber: customer.vatNumber || '',
      paymentTerms: customer.paymentTerms || 30,
      language: customer.language || 'de',
      notes: customer.notes || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateCustomer = async () => {
    try {
      if (!selectedCustomer) return

      console.log('Updating customer:', selectedCustomer.id, newCustomer)
      
      // Filter out empty strings to avoid validation errors
      const customerData = Object.fromEntries(
        Object.entries(newCustomer).filter(([_, value]) => value !== '')
      )
      
      const response = await customerAPI.updateCustomer(selectedCustomer.id, customerData)
      console.log('Update response:', response)

      if (response.success) {
        setNotification({ type: 'success', message: 'Customer updated successfully!' })
        setShowEditModal(false)
        setSelectedCustomer(null)
        loadData()
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: response.error || 'Failed to update customer' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error updating customer:', error)
      setNotification({ type: 'error', message: 'Failed to update customer' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleDeleteCustomer = async (customer: any) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) return

    try {
      const response = await customerAPI.deleteCustomer(customer.id)
      if (response.success) {
        setNotification({ type: 'success', message: 'Customer deleted successfully!' })
        loadData()
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: response.error || 'Failed to delete customer' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      setNotification({ type: 'error', message: 'Failed to delete customer' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleCsvImport = async () => {
    try {
      if (!csvData.trim()) {
        setNotification({ type: 'error', message: 'Please paste CSV data' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      // Parse CSV data
      const lines = csvData.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      const customers = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim())
        const customer: any = {}
        
        headers.forEach((header, i) => {
          const value = values[i] || ''
          switch (header) {
            case 'name':
              customer.name = value
              break
            case 'company':
              customer.company = value
              break
            case 'email':
              customer.email = value
              break
            case 'address':
              customer.address = value
              break
            case 'zip':
              customer.zip = value
              break
            case 'city':
              customer.city = value
              break
            case 'country':
              customer.country = value || 'CH'
              break
            case 'phone':
              customer.phone = value
              break
            case 'vatnumber':
            case 'vat_number':
              customer.vatNumber = value
              break
            case 'paymentterms':
            case 'payment_terms':
              customer.paymentTerms = parseInt(value) || 30
              break
            case 'language':
              customer.language = value || 'de'
              break
            case 'notes':
              customer.notes = value
              break
          }
        })
        
        return customer
      }).filter(customer => customer.name && customer.address && customer.zip && customer.city)

      if (customers.length === 0) {
        setNotification({ type: 'error', message: 'No valid customers found in CSV data' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      console.log('Importing customers:', customers)
      const response = await customerAPI.importCustomers(customers)
      console.log('Import response:', response)

      if (response.success) {
        setNotification({ type: 'success', message: `Successfully imported ${customers.length} customers!` })
        setShowImportModal(false)
        setCsvData('')
        loadData()
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: response.error || 'Failed to import customers' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error importing customers:', error)
      setNotification({ type: 'error', message: 'Import failed. Please check your CSV format.' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleCreateCustomer = async () => {
    try {
      console.log('Creating customer with data:', newCustomer)
      
      // Check authentication
      const token = localStorage.getItem('token')
      console.log('Token exists:', !!token)
      console.log('Token value:', token ? token.substring(0, 20) + '...' : 'No token')
      
      // Validate required fields before sending
      if (!newCustomer.name || newCustomer.name.length < 2) {
        setNotification({ type: 'error', message: 'Name must be at least 2 characters' })
        setTimeout(() => setNotification(null), 5000)
        return
      }
      
      if (!newCustomer.address || newCustomer.address.length < 5) {
        setNotification({ type: 'error', message: 'Address must be at least 5 characters' })
        setTimeout(() => setNotification(null), 5000)
        return
      }
      
      if (!newCustomer.zip || newCustomer.zip.length < 4) {
        setNotification({ type: 'error', message: 'ZIP code must be at least 4 characters' })
        setTimeout(() => setNotification(null), 5000)
        return
      }
      
      if (!newCustomer.city || newCustomer.city.length < 2) {
        setNotification({ type: 'error', message: 'City must be at least 2 characters' })
        setTimeout(() => setNotification(null), 5000)
        return
      }
      
      // Filter out empty strings to avoid validation errors
      const customerData = Object.fromEntries(
        Object.entries(newCustomer).filter(([_, value]) => value !== '')
      ) as {
        name: string
        company?: string
        address: string
        zip: string
        city: string
        country?: string
        email?: string
        phone?: string
        uid?: string
        vatNumber?: string
        paymentTerms?: number
        language?: string
        notes?: string
      }
      
      console.log('Filtered customer data:', customerData)
      const response = await customerAPI.createCustomer(customerData)
      console.log('Customer creation response:', response)
      
      if (response.success) {
        setNotification({ type: 'success', message: 'Customer created successfully!' })
        setShowCreateModal(false)
        setNewCustomer({
          name: '',
          company: '',
          address: '',
          zip: '',
          city: '',
          country: 'CH',
          email: '',
          phone: '',
          vatNumber: '',
          paymentTerms: 30,
          language: 'de',
          notes: ''
        })
        loadData()
        
        // Auto-hide notification after 3 seconds
        setTimeout(() => setNotification(null), 3000)
      } else {
        console.error('Backend error details:', response)
        setNotification({ type: 'error', message: response.error || response.details || 'Failed to create customer' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error creating customer:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)
      console.error('Error details:', JSON.stringify(error.response?.data, null, 2))
      setNotification({ 
        type: 'error', 
        message: error.response?.data?.error || error.response?.data?.details || 'Network error. Please try again.' 
      })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount)
  }

  // Ensure customers is always an array
  const safeCustomers = Array.isArray(customers) ? customers : []

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Customers</h1>
          <p className="text-slate-600">Manage your customer database</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Customers</span>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : safeCustomers.length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Active</span>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : safeCustomers.filter((c: any) => c.status === 'active').length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">New This Month</span>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : safeCustomers.filter((c: any) => {
                const created = new Date(c.createdAt)
                const now = new Date()
                return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
              }).length}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customer Management</h2>
              <p className="text-sm text-slate-600">Add, edit, and manage your customers</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-slate-100 text-slate-900 font-medium rounded-lg hover:bg-slate-200 transition"
              >
                Import CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-[#2C4A6B] text-white font-medium rounded-lg hover:bg-[#1e3a5f] transition"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">All Customers</h3>
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
          ) : safeCustomers.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {safeCustomers.map((customer: any) => (
                <div key={customer.id} className="p-4 sm:p-6 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-slate-900 mb-1">
                        {customer.name}
                      </h4>
                      <p className="text-sm text-slate-600 mb-1">
                        {customer.company || 'No company'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {customer.email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleViewCustomer(customer)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleEditCustomer(customer)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteCustomer(customer)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No customers yet</h3>
              <p className="text-slate-600 mb-6">Get started by adding your first customer</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-[#2C4A6B] text-white font-medium rounded-lg hover:bg-[#1e3a5f] transition"
              >
                Add Your First Customer
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 ${
            notification.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex-shrink-0">
              {notification.type === 'success' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="flex-shrink-0 ml-4 text-white hover:text-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Enhanced View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">{selectedCustomer.name}</h2>
                {selectedCustomer.company && (
                  <p className="text-sm sm:text-base text-slate-600 truncate">{selectedCustomer.company}</p>
                )}
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200">
              <nav className="flex space-x-2 sm:space-x-4 lg:space-x-8 px-4 sm:px-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center ${
                    activeTab === 'info'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">Customer Information</span>
                  <span className="sm:hidden">Info</span>
                </button>
                <button
                  onClick={() => setActiveTab('invoices')}
                  className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center ${
                    activeTab === 'invoices'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Invoices ({customerInvoices.length})</span>
                  <span className="sm:hidden">Invoices ({customerInvoices.length})</span>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-6 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
              {activeTab === 'info' && (
                <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Contact Information
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">Full Name</label>
                          <p className="text-slate-900 font-medium">{selectedCustomer.name}</p>
                        </div>
                        {selectedCustomer.company && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">Company</label>
                            <p className="text-slate-900">{selectedCustomer.company}</p>
                          </div>
                        )}
                        {selectedCustomer.email && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">Email</label>
                            <p className="text-slate-900">{selectedCustomer.email}</p>
                          </div>
                        )}
                        {selectedCustomer.phone && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">Phone</label>
                            <p className="text-slate-900">{selectedCustomer.phone}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Address
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">Street Address</label>
                          <p className="text-slate-900">{selectedCustomer.address}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <label className="text-sm font-medium text-slate-600">ZIP Code</label>
                            <p className="text-slate-900">{selectedCustomer.zip}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">City</label>
                            <p className="text-slate-900">{selectedCustomer.city}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Country</label>
                          <p className="text-slate-900">{selectedCustomer.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business Information */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Business Details
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        {selectedCustomer.vatNumber && (
                          <div>
                            <label className="text-sm font-medium text-slate-600">VAT Number</label>
                            <p className="text-slate-900 font-mono">{selectedCustomer.vatNumber}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-sm font-medium text-slate-600">Payment Terms</label>
                          <p className="text-slate-900">{selectedCustomer.paymentTerms} days</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Language</label>
                          <p className="text-slate-900">{selectedCustomer.language?.toUpperCase()}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        System Information
                      </h3>
                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">Customer Number</label>
                          <p className="text-slate-900 font-mono">{selectedCustomer.customerNumber}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Created</label>
                          <p className="text-slate-900">{new Date(selectedCustomer.createdAt).toLocaleDateString('de-CH')}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">Last Updated</label>
                          <p className="text-slate-900">{new Date(selectedCustomer.updatedAt).toLocaleDateString('de-CH')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedCustomer.notes && (
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4 sm:mb-6 flex items-center">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Notes
                      </h3>
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-slate-700 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">Customer Invoices</h3>
                    <div className="text-xs sm:text-sm text-slate-600">
                      {customerInvoices.length} invoice{customerInvoices.length !== 1 ? 's' : ''} found
                    </div>
                  </div>

                  {customerInvoices.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-500 text-base sm:text-lg">No invoices found for this customer</p>
                      <p className="text-slate-400 text-sm mt-2">Create an invoice to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {customerInvoices.map((invoice: any) => (
                        <div key={invoice.id} className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                <h4 className="font-medium text-slate-900 truncate">{invoice.number}</h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                                  invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                  invoice.status === 'OPEN' ? 'bg-blue-100 text-blue-800' :
                                  invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {invoice.status}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 lg:space-x-6 text-xs sm:text-sm text-slate-600">
                                <span>Date: {new Date(invoice.date).toLocaleDateString('de-CH')}</span>
                                <span>Due: {new Date(invoice.dueDate).toLocaleDateString('de-CH')}</span>
                                <span className="font-medium text-slate-900">CHF {invoice.total.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setShowViewModal(false)
                                  router.push('/invoices')
                                }}
                                className="px-2 sm:px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setShowViewModal(false)
                                  router.push('/invoices')
                                }}
                                className="px-2 sm:px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                              >
                                PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-4 sm:p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition order-2 sm:order-1"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false)
                  handleEditCustomer(selectedCustomer)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition order-1 sm:order-2"
              >
                Edit Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Import Customers from CSV</h2>
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
              {/* CSV Format Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">CSV Format</h3>
                <p className="text-sm text-blue-800 mb-3">Paste your CSV data below. The first row should contain headers.</p>
                <div className="text-xs text-blue-700 font-mono bg-blue-100 p-2 rounded">
                  name,company,email,address,zip,city,country,phone,vatNumber,paymentTerms,language,notes
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  <strong>Required:</strong> name, address, zip, city<br/>
                  <strong>Optional:</strong> company, email, phone, vatNumber, paymentTerms, language, notes
                </p>
              </div>

              {/* CSV Data Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">CSV Data</label>
                <textarea
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={10}
                  placeholder="name,company,email,address,zip,city,country,phone,vatNumber,paymentTerms,language,notes&#10;John Doe,ACME Corp,john@acme.com,123 Main St,8001,Zurich,CH,+41 44 123 45 67,CHE-123.456.789,30,de,Important client&#10;Jane Smith,,jane@example.com,456 Oak Ave,3000,Bern,CH,+41 31 987 65 43,,14,de,Regular customer"
                />
              </div>

              {/* Sample Data */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">Sample CSV Data:</h4>
                <div className="text-xs text-gray-600 font-mono whitespace-pre-line">
{`name,company,email,address,zip,city,country,phone,vatNumber,paymentTerms,language,notes
John Doe,ACME Corp,john@acme.com,123 Main St,8001,Zurich,CH,+41 44 123 45 67,CHE-123.456.789,30,de,Important client
Jane Smith,,jane@example.com,456 Oak Ave,3000,Bern,CH,+41 31 987 65 43,,14,de,Regular customer
Max Mustermann,Mustermann GmbH,max@mustermann.de,Musterstraße 1,80331,München,DE,+49 89 12345678,DE123456789,30,de,German customer`}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCsvImport}
                  className="px-6 py-2 bg-[#2C4A6B] text-white font-medium rounded-lg hover:bg-[#1e3a5f] transition"
                >
                  Import Customers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Edit Customer</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomer(); }} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name (optional)"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    value={newCustomer.zip}
                    onChange={(e) => setNewCustomer({ ...newCustomer, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="8000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Zürich"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                  <select
                    value={newCustomer.country}
                    onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CH">Switzerland</option>
                    <option value="DE">Germany</option>
                    <option value="AT">Austria</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+41 44 123 45 67"
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">VAT Number</label>
                  <input
                    type="text"
                    value={newCustomer.vatNumber}
                    onChange={(e) => setNewCustomer({ ...newCustomer, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CHE-123.456.789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms (days)</label>
                  <select
                    value={newCustomer.paymentTerms}
                    onChange={(e) => setNewCustomer({ ...newCustomer, paymentTerms: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Immediate</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                <select
                  value={newCustomer.language}
                  onChange={(e) => setNewCustomer({ ...newCustomer, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="it">Italian</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes about this customer"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#2C4A6B] text-white font-medium rounded-lg hover:bg-[#1e3a5f] transition"
                >
                  Update Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add New Customer</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleCreateCustomer(); }} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Company</label>
                  <input
                    type="text"
                    value={newCustomer.company}
                    onChange={(e) => setNewCustomer({ ...newCustomer, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name (optional)"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address *</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ZIP Code *</label>
                  <input
                    type="text"
                    value={newCustomer.zip}
                    onChange={(e) => setNewCustomer({ ...newCustomer, zip: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="8000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Zürich"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                  <select
                    value={newCustomer.country}
                    onChange={(e) => setNewCustomer({ ...newCustomer, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CH">Switzerland</option>
                    <option value="DE">Germany</option>
                    <option value="AT">Austria</option>
                    <option value="FR">France</option>
                    <option value="IT">Italy</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+41 44 123 45 67"
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">VAT Number</label>
                  <input
                    type="text"
                    value={newCustomer.vatNumber}
                    onChange={(e) => setNewCustomer({ ...newCustomer, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="CHE-123.456.789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Terms (days)</label>
                  <select
                    value={newCustomer.paymentTerms}
                    onChange={(e) => setNewCustomer({ ...newCustomer, paymentTerms: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Immediate</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Language</label>
                <select
                  value={newCustomer.language}
                  onChange={(e) => setNewCustomer({ ...newCustomer, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="it">Italian</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Additional notes about this customer"
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
                  className="px-6 py-2 bg-[#2C4A6B] text-white font-medium rounded-lg hover:bg-[#1e3a5f] transition"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  )
}