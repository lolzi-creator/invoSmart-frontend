import axios from 'axios'

// Use environment variable for API URL, fallback to Railway production URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://invosmart-backend-production.up.railway.app/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth API
export const authAPI = {
  register: async (userData: {
    name: string
    email: string
    password: string
    companyName: string
    address: string
    zip: string
    city: string
    phone?: string
    companyEmail: string
    uid?: string
    vatNumber?: string
    iban?: string
  }) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },

  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
}

// Customer API
export const customerAPI = {
  getCustomers: async () => {
    const response = await api.get('/customers')
    return response.data
  },

  createCustomer: async (customerData: {
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
  }) => {
    const response = await api.post('/customers', customerData)
    return response.data
  },

  updateCustomer: async (id: string, customerData: {
    name?: string
    company?: string
    address?: string
    zip?: string
    city?: string
    country?: string
    email?: string
    phone?: string
    uid?: string
    vatNumber?: string
    paymentTerms?: number
    language?: string
    notes?: string
    isActive?: boolean
  }) => {
    const response = await api.put(`/customers/${id}`, customerData)
    return response.data
  },

  deleteCustomer: async (id: string) => {
    const response = await api.delete(`/customers/${id}`)
    return response.data
  },

  importCustomers: async (customers: Array<any>) => {
    const response = await api.post('/customers/import', { customers })
    return response.data
  },
}

// Invoice API
export const invoiceAPI = {
  getInvoices: async () => {
    const response = await api.get('/invoices')
    return response.data
  },

  getInvoice: async (id: string) => {
    const response = await api.get(`/invoices/${id}`)
    return response.data
  },

  createInvoice: async (invoiceData: {
    customerId: string
    date?: string
    dueDate?: string
    items: Array<{
      description: string
      quantity: number
      unit?: string
      unitPrice: number
      discount?: number
      vatRate: number
    }>
    discountCode?: string
    discountAmount?: number
  }) => {
    const response = await api.post('/invoices', invoiceData)
    return response.data
  },

  updateInvoice: async (id: string, invoiceData: {
    customerId?: string
    date?: string
    dueDate?: string
    status?: string
    items?: Array<{
      description: string
      quantity: number
      unit?: string
      unitPrice: number
      discount?: number
      vatRate: number
    }>
    discountCode?: string
    discountAmount?: number
  }) => {
    const response = await api.put(`/invoices/${id}`, invoiceData)
    return response.data
  },

  updateInvoiceStatus: async (id: string, status: string) => {
    const response = await api.patch(`/invoices/${id}/status`, { status })
    return response.data
  },

  generateQRCode: async (invoiceId: string) => {
    const response = await api.get(`/invoices/${invoiceId}/qr`)
    return response.data
  },

  generatePDF: async (invoiceId: string) => {
    const response = await api.get(`/invoices/${invoiceId}/pdf`, {
      responseType: 'blob'
    })
    return response.data
  },

  generateReminderPDF: async (invoiceId: string, level: number) => {
    const response = await api.get(`/invoices/${invoiceId}/reminder-pdf/${level}`, {
      responseType: 'blob'
    })
    return response.data
  },
}

// QR API
export const qrAPI = {
  generateTest: async (payload: {
    amount?: number
    currency?: 'CHF' | 'EUR'
    debtor?: { name?: string; address?: string; zip?: string; city?: string; country?: string }
  }) => {
    const response = await api.post('/qr/test', payload)
    return response.data
  }
}

// Payment API
export const paymentAPI = {
  getAll: async () => {
    const response = await api.get('/payments')
    return response.data
  },

  getPayments: async () => {
    const response = await api.get('/payments')
    return response.data
  },

  createPayment: async (paymentData: {
    amount: number
    valueDate: string
    reference?: string
    description?: string
  }) => {
    // Convert CHF to Rappen (Swiss cents) - multiply by 100
    const formattedData = {
      ...paymentData,
      amount: Math.round(Number(paymentData.amount) * 100), // Convert CHF to Rappen
      valueDate: paymentData.valueDate,
      reference: paymentData.reference || undefined,
      description: paymentData.description || undefined
    }
    const response = await api.post('/payments', formattedData)
    return response.data
  },

  importPayments: async (payments: Array<any>) => {
    // Convert CHF to Rappen for each payment
    const formattedPayments = payments.map(payment => ({
      ...payment,
      amount: Math.round(Number(payment.amount) * 100)
    }))
    
    const response = await api.post('/payments/import', { payments: formattedPayments })
    return response.data
  },

  manualMatch: async (paymentId: string, matchData: { invoiceId?: string | null }) => {
    const response = await api.post(`/payments/${paymentId}/match`, matchData)
    return response.data
  },

  runAutoMatch: async () => {
    const response = await api.post('/payments/auto-match')
    return response.data
  },

  importCSV: async (csvData: string) => {
    const response = await api.post('/payments/import/csv', { csvData })
    return response.data
  },

  importMT940: async (mt940Data: string) => {
    const response = await api.post('/payments/import/mt940', { mt940Data })
    return response.data
  },

  importCAMT053: async (camt053Data: string) => {
    const response = await api.post('/payments/import/camt053', { camt053Data })
    return response.data
  }
}
