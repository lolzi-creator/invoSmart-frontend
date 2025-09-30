'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { invoiceAPI } from '@/lib/api'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

interface Invoice {
  id: string
  number: string
  customerId: string
  date: string
  dueDate: string
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'OVERDUE'
  subtotal: number
  vatAmount: number
  total: number
  paidAmount: number
  qrReference: string
  reminderLevel: number
  customer: {
    name: string
    company?: string
  }
}

const statusColumns = [
  { id: 'DRAFT', title: 'Draft', color: 'bg-gray-100', textColor: 'text-gray-700' },
  { id: 'OPEN', title: 'Sent', color: 'bg-blue-100', textColor: 'text-blue-700' },
  { id: 'PAID', title: 'Paid', color: 'bg-green-100', textColor: 'text-green-700' },
  { id: 'OVERDUE', title: 'Overdue', color: 'bg-red-100', textColor: 'text-red-700' }
]

export default function InvoicesBoard() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await invoiceAPI.getInvoices()
      if (response.success) {
        setInvoices(response.data.invoices || [])
      } else {
        setNotification({ type: 'error', message: 'Failed to load invoices' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error)
      setNotification({ type: 'error', message: 'Failed to load invoices' })
      setTimeout(() => setNotification(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const newStatus = destination.droppableId
    const invoiceId = draggableId

    try {
      // Update invoice status
      const response = await invoiceAPI.updateInvoiceStatus(invoiceId, newStatus)
      
      if (response.success) {
        // Update local state
        setInvoices(prevInvoices => 
          prevInvoices.map(invoice => 
            invoice.id === invoiceId 
              ? { ...invoice, status: newStatus }
              : invoice
          )
        )
        
        setNotification({ type: 'success', message: 'Invoice status updated successfully' })
        setTimeout(() => setNotification(null), 3000)
      } else {
        setNotification({ type: 'error', message: 'Failed to update invoice status' })
        setTimeout(() => setNotification(null), 5000)
      }
    } catch (error: any) {
      console.error('Error updating invoice status:', error)
      setNotification({ type: 'error', message: 'Failed to update invoice status' })
      setTimeout(() => setNotification(null), 5000)
    }
  }

  const getInvoicesByStatus = (status: string) => {
    return invoices.filter(invoice => invoice.status === status)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-CH')
  }

  const getStatusColor = (status: string) => {
    const column = statusColumns.find(col => col.id === status)
    return column ? column.color : 'bg-gray-100'
  }

  const getStatusTextColor = (status: string) => {
    const column = statusColumns.find(col => col.id === status)
    return column ? column.textColor : 'text-gray-700'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoices...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Invoice Board</h1>
              <p className="mt-1 text-sm text-gray-500">Drag and drop invoices to update their status</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/invoices')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <button
                onClick={loadData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

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

      {/* Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statusColumns.map((column) => {
              const columnInvoices = getInvoicesByStatus(column.id)
              
              return (
                <div key={column.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                  {/* Column Header */}
                  <div className={`px-4 py-3 border-b border-gray-200 ${column.color}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${column.textColor}`}>
                        {column.title}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${column.textColor} ${column.color}`}>
                        {columnInvoices.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Content */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[200px] p-4 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        {columnInvoices.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm">No invoices</p>
                          </div>
                        ) : (
                          columnInvoices.map((invoice, index) => (
                            <Draggable key={invoice.id} draggableId={invoice.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`mb-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-move ${
                                    snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                  }`}
                                >
                                  {/* Invoice Header */}
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="text-sm font-medium text-gray-900">
                                        {invoice.number}
                                      </h4>
                                      <p className="text-xs text-gray-500">
                                        {invoice.customer?.name || 'Unknown Customer'}
                                        {invoice.customer?.company && ` • ${invoice.customer.company}`}
                                      </p>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)} ${getStatusTextColor(invoice.status)}`}>
                                      {invoice.status}
                                    </span>
                                  </div>

                                  {/* Invoice Details */}
                                  <div className="space-y-1 text-xs text-gray-600">
                                    <div className="flex justify-between">
                                      <span>Date:</span>
                                      <span>{formatDate(invoice.date)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Due:</span>
                                      <span>{formatDate(invoice.dueDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Total:</span>
                                      <span className="font-medium text-gray-900">CHF {invoice.total.toFixed(2)}</span>
                                    </div>
                                    {invoice.paidAmount > 0 && (
                                      <div className="flex justify-between">
                                        <span>Paid:</span>
                                        <span className="text-green-600">CHF {invoice.paidAmount.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* QR Reference */}
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">
                                      QR: {invoice.qrReference}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      </div>
    </div>
  )
}
