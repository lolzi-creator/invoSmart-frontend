'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { invoiceAPI, customerAPI } from '@/lib/api'
import BottomNavbar from '@/components/BottomNavbar'

export default function InvoicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [invoices, setInvoices] = useState<Array<any>>([])
  const [customers, setCustomers] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfZoom, setPdfZoom] = useState(100)
  const [customerSearch, setCustomerSearch] = useState('')
  const [filteredCustomers, setFilteredCustomers] = useState<Array<any>>([])
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unit: 'Stk', price: 0, discount: 0, vatRate: 7.7 }],
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
      const [invoicesRes, customersRes] = await Promise.all([
        invoiceAPI.getInvoices(),
        customerAPI.getCustomers()
      ])
      
      console.log('Invoices response:', invoicesRes)
      console.log('Customers response:', customersRes)
      
      if (invoicesRes.success && Array.isArray(invoicesRes.data?.invoices)) {
        // Load invoices
        
        setInvoices(invoicesRes.data.invoices)
      }
      
      if (customersRes.success && Array.isArray(customersRes.data?.customers)) {
        setCustomers(customersRes.data.customers)
        setFilteredCustomers(customersRes.data.customers)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/')
  }

  // Customer search functionality
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value
    setCustomerSearch(searchTerm)
    if (searchTerm.trim() === '') {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredCustomers(filtered)
    }
  }

  const handleSelectCustomer = (customer: any) => {
    setNewInvoice({ ...newInvoice, customerId: customer.id })
    setCustomerSearch(`${customer.name} ${customer.company ? `(${customer.company})` : ''}`)
    setFilteredCustomers([])
  }

  // Invoice creation with validation
  const handleCreateInvoice = async () => {
    try {
      // Validation
      if (!newInvoice.customerId) {
        setNotification({ type: 'error', message: 'Please select a customer' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      if (!newInvoice.invoiceDate || !newInvoice.dueDate) {
        setNotification({ type: 'error', message: 'Please select invoice and due dates' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      // Validate items
      const validItems = newInvoice.items.filter(item => 
        item.description.trim() !== '' && 
        item.quantity > 0 && 
        item.price >= 0
      )

      if (validItems.length === 0) {
        setNotification({ type: 'error', message: 'Please add at least one valid item' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      // Calculate totals
      const subtotal = validItems.reduce((sum, item) => {
        const itemTotal = item.quantity * item.price
        const discountAmount = itemTotal * (item.discount / 100)
        return sum + itemTotal - discountAmount
      }, 0)

      if (subtotal <= 0) {
        setNotification({ type: 'error', message: 'Invoice total must be greater than 0' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      // Transform data to match API expectations
      const invoiceData = {
        customerId: newInvoice.customerId,
        date: newInvoice.invoiceDate, // Keep as string for API
        dueDate: newInvoice.dueDate, // Keep as string for API
        items: validItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit === 'Stk' ? 'Stück' : item.unit, // Convert Stk to Stück
          unitPrice: item.price,
          discount: item.discount,
          vatRate: item.vatRate
        })),
        discountCode: newInvoice.notes || undefined // Send undefined instead of empty string
      }
      
      console.log('Creating invoice with data:', invoiceData)
      console.log('Data being sent to API:', JSON.stringify(invoiceData, null, 2))
      console.log('API function being called:', invoiceAPI.createInvoice)
      console.log('API object:', invoiceAPI)
      console.log('API base URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1')
      console.log('Available API methods:', Object.keys(invoiceAPI))
      
      const response = await invoiceAPI.createInvoice(invoiceData)
      console.log('Invoice creation response:', response)
      console.log('Response type:', typeof response)
      console.log('Response success:', response.success)
      console.log('Response data:', response.data)

      if (response.success) {
        setNotification({ type: 'success', message: 'Invoice created successfully!' })
        setShowCreateModal(false)
        setNewInvoice({
          customerId: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: [{ description: '', quantity: 1, unit: 'Stk', price: 0, discount: 0, vatRate: 7.7 }],
          notes: ''
        })
        setCustomerSearch('')
        loadData()
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: response.error || 'Failed to create invoice' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      console.error('Error type:', typeof error)
      console.error('Error message:', error.message)
      console.error('Error response:', error.response)
      console.error('Error status:', error.response?.status)
      console.error('Error data:', error.response?.data)
      console.error('Error config:', error.config)
      console.error('Full error object:', JSON.stringify(error, null, 2))
      
      let errorMessage = 'Failed to create invoice'
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.data?.details) {
        errorMessage = error.response.data.details
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setNotification({ type: 'error', message: errorMessage })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount)
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

  const handleViewInvoice = async (invoice: any) => {
    try {
      // Fetch complete invoice data with items
      const response = await invoiceAPI.getInvoice(invoice.id)
      if (response.success) {
        setSelectedInvoice(response.data.invoice)
        setShowViewModal(true)
      } else {
        setNotification({ type: 'error', message: 'Failed to load invoice details' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error loading invoice:', error)
      setNotification({ type: 'error', message: 'Failed to load invoice details' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice)
    setNewInvoice({
      customerId: invoice.customerId,
      invoiceDate: new Date(invoice.date).toISOString().split('T')[0],
      dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      items: invoice.items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unit: item.unit === 'Stück' ? 'Stk' : item.unit,
        price: item.unitPrice,
        discount: item.discount,
        vatRate: item.vatRate
      })),
      notes: invoice.discountCode || ''
    })
    setShowEditModal(true)
  }

  const handleUpdateInvoice = async () => {
    try {
      // Validation
      if (!newInvoice.customerId) {
        setNotification({ type: 'error', message: 'Please select a customer' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      if (!newInvoice.invoiceDate || !newInvoice.dueDate) {
        setNotification({ type: 'error', message: 'Please fill in all required fields' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      const validItems = newInvoice.items.filter(item => 
        item.description.trim() && item.quantity > 0 && item.price >= 0
      )

      if (validItems.length === 0) {
        setNotification({ type: 'error', message: 'Please add at least one valid item' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      const subtotal = calculateSubtotal(validItems)
      if (subtotal <= 0) {
        setNotification({ type: 'error', message: 'Invoice total must be greater than 0' })
        setTimeout(() => setNotification(null), 5000)
        return
      }

      // Transform data to match API expectations
      const invoiceData = {
        customerId: newInvoice.customerId,
        date: newInvoice.invoiceDate, // Keep as string for API
        dueDate: newInvoice.dueDate, // Keep as string for API
        items: validItems.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit === 'Stk' ? 'Stück' : item.unit,
          unitPrice: item.price,
          discount: item.discount,
          vatRate: item.vatRate
        })),
        discountCode: newInvoice.notes || undefined
      }

      const response = await invoiceAPI.updateInvoice(selectedInvoice.id, invoiceData)
      
      if (response.success) {
        setNotification({ type: 'success', message: 'Invoice updated successfully!' })
        setShowEditModal(false)
        setSelectedInvoice(null)
        loadData()
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: response.error || 'Failed to update invoice' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      setNotification({ type: 'error', message: 'Failed to update invoice' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const handleGeneratePDF = async (invoice: any) => {
    try {
      setPdfLoading(true)
      setSelectedInvoice(invoice)
      setNotification({ type: 'success', message: 'Generating PDF...' })
      
      const response = await invoiceAPI.generatePDF(invoice.id)
      
      if (response) {
        // Create blob for preview and download
        const blob = new Blob([response], { type: 'application/pdf' })
        setPdfBlob(blob)
        setShowPdfModal(true)
        setNotification({ type: 'success', message: 'PDF generated successfully!' })
        setTimeout(() => setNotification(null), 3000)
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error)
      setNotification({ type: 'error', message: 'Failed to generate PDF' })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    if (pdfBlob && selectedInvoice) {
      const url = window.URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${selectedInvoice.invoiceNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  }

  const calculateItemTotal = (item: any) => {
    const itemTotal = item.quantity * item.price
    const discountAmount = itemTotal * (item.discount / 100)
    return itemTotal - discountAmount
  }

  const calculateSubtotal = (items = newInvoice.items) => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
  }

  const calculateInvoiceSubtotal = (invoice: any) => {
    const items = invoice.items || invoice.invoice_items || invoice.lineItems || []
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 0
    }
    
    return items.reduce((sum: number, item: any) => {
      const quantity = item.quantity || item.qty || 0
      const unitPrice = item.unitPrice || item.price || item.unit_price || 0
      const discount = item.discount || 0
      const itemTotal = (quantity * unitPrice) * (1 - discount / 100)
      return sum + itemTotal
    }, 0)
  }

  const calculateInvoiceVAT = (invoice: any) => {
    const items = invoice.items || invoice.invoice_items || invoice.lineItems || []
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 0
    }
    
    return items.reduce((sum: number, item: any) => {
      const quantity = item.quantity || item.qty || 0
      const unitPrice = item.unitPrice || item.price || item.unit_price || 0
      const discount = item.discount || 0
      const vatRate = item.vatRate || item.vat_rate || item.taxRate || 0
      const itemTotal = (quantity * unitPrice) * (1 - discount / 100)
      const vatAmount = itemTotal * (vatRate / 100)
      return sum + vatAmount
    }, 0)
  }

  const calculateInvoiceTotal = (invoice: any) => {
    console.log('Calculating total for invoice:', invoice.invoiceNumber, 'Items:', invoice.items)
    console.log('Full invoice object:', invoice)
    
    // Check if items exist in different possible locations
    const items = invoice.items || invoice.invoice_items || invoice.lineItems || []
    console.log('Items found:', items)
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      console.log('No items found, returning 0')
      return 0
    }
    
    const total = items.reduce((sum: number, item: any, index: number) => {
      // Try different possible field names
      const quantity = item.quantity || item.qty || 0
      const unitPrice = item.unitPrice || item.price || item.unit_price || 0
      const discount = item.discount || 0
      const vatRate = item.vatRate || item.vat_rate || item.taxRate || 0
      
      const itemTotal = (quantity * unitPrice) * (1 - discount / 100)
      const vatAmount = itemTotal * (vatRate / 100)
      const itemSum = itemTotal + vatAmount
      
      console.log(`Item ${index + 1}:`, {
        quantity: quantity,
        unitPrice: unitPrice,
        discount: discount,
        vatRate: vatRate,
        itemTotal: itemTotal,
        vatAmount: vatAmount,
        itemSum: itemSum,
        originalItem: item
      })
      
      return sum + itemSum
    }, 0)
    
    console.log('Final calculated total:', total)
    return total
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Invoices</h1>
          <p className="text-slate-600">Manage your invoices and billing</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Total Invoices</span>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : invoices.length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Outstanding</span>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : formatCurrency(
                invoices
                  .filter((inv: any) => inv.status === 'open' || inv.status === 'teilbezahlt')
                  .reduce((sum: number, inv: any) => sum + (inv.total || 0), 0)
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Overdue</span>
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {loading ? '...' : invoices.filter((inv: any) => {
                if (inv.status === 'bezahlt') return false
                const dueDate = new Date(inv.dueDate)
                return dueDate < new Date()
              }).length}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-slate-200 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Invoice Management</h2>
              <p className="text-sm text-slate-600">Create, view, and manage your invoices</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition"
              >
                Create Invoice
              </button>
              <button
                onClick={() => router.push('/invoices/board')}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                Board View
              </button>
            </div>
          </div>
        </div>

        {/* Invoices List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="p-4 sm:p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">All Invoices</h3>
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
          ) : invoices.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {invoices.map((invoice: any) => (
                <div key={invoice.id} className="p-4 sm:p-6 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-slate-900">
                          #{invoice.invoiceNumber}
                        </h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                          {invoice.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        {invoice.customer?.name || 'Unknown Customer'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Due: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(invoice.total || 0)}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <button 
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleEditInvoice(invoice)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleGeneratePDF(invoice)}
                          disabled={pdfLoading}
                          className={`text-xs font-medium transition ${
                            pdfLoading 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-red-600 hover:text-red-800'
                          }`}
                        >
                          {pdfLoading ? 'Generating...' : 'PDF'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No invoices yet</h3>
              <p className="text-slate-600 mb-6">Get started by creating your first invoice</p>
              <button
                className="px-6 py-3 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition"
              >
                Create Your First Invoice
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

      {/* PDF Loading Overlay */}
      {pdfLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <div className="text-lg font-medium text-slate-900">Generating PDF...</div>
            <div className="text-sm text-slate-600">Please wait while we create your invoice</div>
          </div>
        </div>
      )}

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
              {/* Customer Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Customer *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={handleCustomerSearch}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search customers by name, company, or email..."
                    required
                  />
                  {filteredCustomers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer: any) => (
                        <div
                          key={customer.id}
                          onClick={() => handleSelectCustomer(customer)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">{customer.name}</div>
                          {customer.company && (
                            <div className="text-sm text-slate-600">{customer.company}</div>
                          )}
                          {customer.email && (
                            <div className="text-xs text-slate-500">{customer.email}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {newInvoice.customerId && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Customer selected
                  </div>
                )}
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
                    <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-3 p-4 bg-slate-50 rounded-lg">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Item description"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Qty *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0.01"
                          step="0.01"
                          required
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
                        <label className="block text-xs font-medium text-slate-600 mb-1">Price (CHF) *</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Discount (%)</label>
                        <input
                          type="number"
                          value={item.discount}
                          onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </div>
                      <div className="flex items-end space-x-1">
                        <div className="text-right">
                          <div className="text-xs text-slate-600 mb-1">Total</div>
                          <div className="text-sm font-semibold text-slate-900">
                            {formatCurrency(calculateItemTotal(item))}
                          </div>
                        </div>
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

                {/* Invoice Totals */}
                <div className="mt-6 p-4 bg-slate-100 rounded-lg">
                  <div className="flex justify-end">
                    <div className="w-64">
                      <div className="flex justify-between text-lg font-semibold text-slate-900">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(calculateSubtotal())}</span>
                      </div>
                    </div>
                  </div>
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

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Invoice #{selectedInvoice.invoiceNumber}</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Company Details</h3>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p className="font-medium">{company?.name}</p>
                    <p>{company?.address}</p>
                    <p>{company?.zip} {company?.city}</p>
                    <p>{company?.country}</p>
                    {company?.vatNumber && <p>MWST-Nr: {company.vatNumber}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Customer Details</h3>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p className="font-medium">{selectedInvoice.customer?.name}</p>
                    <p>{selectedInvoice.customer?.address}</p>
                    <p>{selectedInvoice.customer?.zip} {selectedInvoice.customer?.city}</p>
                    <p>{selectedInvoice.customer?.country}</p>
                    {selectedInvoice.customer?.vatNumber && <p>UID: {selectedInvoice.customer.vatNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Invoice Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-slate-700">Invoice Date</label>
                  <p className="text-slate-900">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Due Date</label>
                  <p className="text-slate-900">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedInvoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                    selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedInvoice.status?.replace('_', ' ') || 'open'}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Discount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">VAT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {selectedInvoice.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.unit}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">CHF {item.unitPrice?.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.discount}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{item.vatRate}%</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                            CHF {item.lineTotal?.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="text-slate-900">CHF {(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">VAT:</span>
                      <span className="text-slate-900">CHF {(selectedInvoice.vatAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                      <span className="text-slate-900">Total:</span>
                      <span className="text-slate-900">CHF {(selectedInvoice.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                >
                  Close
                </button>
                <button
                  onClick={() => handleGeneratePDF(selectedInvoice)}
                  disabled={pdfLoading}
                  className={`px-6 py-2 font-medium rounded-lg transition ${
                    pdfLoading 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-red-600 text-white hover:bg-red-700'
                  }`}
                >
                  {pdfLoading ? 'Generating PDF...' : 'Generate PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {showEditModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Edit Invoice #{selectedInvoice.invoiceNumber}</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleUpdateInvoice(); }}>
                {/* Customer Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={handleCustomerSearch}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Search customers..."
                    />
                    {customerSearch && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {newInvoice.customerId && (
                    <div className="mt-2 text-sm text-green-600">
                      Selected: {customers.find(c => c.id === newInvoice.customerId)?.name}
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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

                {/* Items */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">Items</h3>
                    <button
                      type="button"
                      onClick={addItem}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {newInvoice.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Item description"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Qty *</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Unit</label>
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="Stk">Stk</option>
                            <option value="Stunde">Stunde</option>
                            <option value="Tag">Tag</option>
                            <option value="Monat">Monat</option>
                            <option value="Jahr">Jahr</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">Price *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="w-full px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition"
                            disabled={newInvoice.items.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="md:col-span-6 grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Discount (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discount}
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">VAT Rate (%)</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.vatRate}
                              onChange={(e) => updateItem(index, 'vatRate', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                        <div className="md:col-span-6 text-right">
                          <span className="text-sm font-medium text-slate-700">
                            Total: CHF {calculateItemTotal(item).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 text-right">
                    <div className="text-lg font-bold text-slate-900">
                      Subtotal: CHF {calculateSubtotal(newInvoice.items).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
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
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition"
                  >
                    Update Invoice
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfModal && pdfBlob && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Invoice PDF Preview</h2>
                <p className="text-sm text-slate-600 mt-1">#{selectedInvoice.invoiceNumber}</p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Zoom Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPdfZoom(Math.max(50, pdfZoom - 25))}
                    className="px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-center">
                    {pdfZoom}%
                  </span>
                  <button
                    onClick={() => setPdfZoom(Math.min(300, pdfZoom + 25))}
                    className="px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setPdfZoom(100)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition text-xs"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
                
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => {
                    setShowPdfModal(false)
                    setPdfBlob(null)
                    setSelectedInvoice(null)
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 p-6">
              <div className="w-full h-full border border-slate-200 rounded-lg overflow-hidden bg-gray-50">
                <iframe
                  src={`${URL.createObjectURL(pdfBlob)}#toolbar=1&navpanes=1&scrollbar=1&zoom=${pdfZoom}`}
                  className="w-full h-full"
                  title={`Invoice ${selectedInvoice.invoiceNumber} PDF`}
                  style={{ minHeight: '60vh' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <div className="text-sm text-slate-600">
                <p>PDF generated on {new Date().toLocaleString()}</p>
                <p>File size: {(pdfBlob.size / 1024).toFixed(1)} KB</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    setShowPdfModal(false)
                    setPdfBlob(null)
                    setSelectedInvoice(null)
                  }}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="px-6 py-2 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition"
                >
                  Download PDF
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