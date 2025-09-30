'use client'

import { useState, useEffect } from 'react'
import { authAPI, qrAPI } from '@/lib/api'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type Step = 1 | 2 | 3 | 4 | 5

export default function RegisterPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [qrCodeData, setQrCodeData] = useState('')
  const [qrCodeImage, setQrCodeImage] = useState('')

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Company Info
    companyName: '',
    legalForm: 'AG',
    uid: '',
    vatNumber: '',
    
    // Step 2: Address & Contact
    address: '',
    zip: '',
    city: '',
    country: 'CH',
    phone: '',
    companyEmail: '',
    website: '',
    
    // Step 3: Banking
    bankName: '',
    iban: '',
    qrIban: '',
    
    // Step 4: Business Settings
    paymentTerms: 30,
    defaultLanguage: 'de',
    defaultVatRate: 7.7,
    
    // User credentials
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateStep = (step: Step): boolean => {
    switch (step) {
      case 1:
        if (!formData.companyName || !formData.uid) {
          setError('Please fill in all required fields')
          return false
        }
        return true
      case 2:
        if (!formData.address || !formData.zip || !formData.city || !formData.companyEmail) {
          setError('Please fill in all required fields')
          return false
        }
        return true
      case 3:
        if (!formData.iban) {
          setError('IBAN is required for Swiss QR invoices')
          return false
        }
        // Basic IBAN validation
        const ibanClean = formData.iban.replace(/\s/g, '')
        if (!ibanClean.startsWith('CH') || ibanClean.length !== 21) {
          setError('Invalid Swiss IBAN format (should be CHxx xxxx xxxx xxxx xxxx x)')
          return false
        }
        return true
      case 4:
        if (!formData.name || !formData.email || !formData.password) {
          setError('Please fill in all required fields')
          return false
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          return false
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters')
          return false
        }
        return true
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((currentStep + 1) as Step)
    }
  }

  const prevStep = () => {
    setCurrentStep((currentStep - 1) as Step)
    setError('')
  }

  const generateTestQR = async () => {
    try {
      const response = await qrAPI.generateTest({
        amount: 10,
        currency: 'CHF',
        debtor: { name: 'Test Debtor', address: 'Teststrasse 1', zip: '8001', city: 'Zürich', country: 'CH' }
      })
      if (response.success) {
        setQrCodeData(response.data.payload)
        setQrCodeImage(response.data.dataUrl)
      }
    } catch (error) {
      console.error('QR generation error:', error)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)
    setError('')

    try {
      const registrationData: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        address: formData.address,
        zip: formData.zip,
        city: formData.city,
        companyEmail: formData.companyEmail,
        iban: formData.iban
      }

      // Only include optional fields if they have values
      if (formData.phone) registrationData.phone = formData.phone
      if (formData.uid) registrationData.uid = formData.uid
      if (formData.vatNumber) registrationData.vatNumber = formData.vatNumber

      const response = await authAPI.register(registrationData)

      if (response.success) {
        // Store token temporarily
        localStorage.setItem('token', response.data.token)
        
        // Generate test QR code
        await generateTestQR()
        
        // Move to QR test step
        setCurrentStep(5)
      } else {
        setError(response.error || 'Registration failed')
      }
    } catch (err: any) {
      console.error('Registration error:', err.response?.data)
      const errorMsg = err.response?.data?.details 
        ? `${err.response.data.error}: ${err.response.data.details.join(', ')}`
        : err.response?.data?.error || 'Registration failed'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const formatIBAN = (value: string) => {
    const clean = value.replace(/\s/g, '').toUpperCase()
    const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean
    return formatted
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="text-4xl font-bold">
              <span className="text-[#2C4A6B]">Invo</span>
              <span className="text-[#10B981]">Smart</span>
            </div>
          </div>
          <p className="text-slate-600">Smart Invoice Management for Swiss Businesses</p>
        </div>

        {/* Stepper Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress Bar */}
          <div className="bg-slate-50 px-8 py-6 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                      currentStep >= step
                        ? 'bg-[#10B981] text-white'
                        : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {step}
                  </div>
                  {step < 5 && (
                    <div
                      className={`w-12 h-1 mx-2 transition-all ${
                        currentStep > step ? 'bg-[#10B981]' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <span className="text-sm font-medium text-slate-600">
                Step {currentStep} of 5
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-8 py-8">
            {/* Step 1: Company Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Company Information</h2>
                  <p className="text-slate-600">Let&apos;s start with your company details</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="e.g., Acme Solutions AG"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Legal Form</label>
                    <select
                      value={formData.legalForm}
                      onChange={(e) => updateFormData('legalForm', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    >
                      <option value="AG">AG (Aktiengesellschaft)</option>
                      <option value="GmbH">GmbH</option>
                      <option value="Einzelfirma">Einzelfirma</option>
                      <option value="KG">KG (Kollektivgesellschaft)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      UID Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.uid}
                      onChange={(e) => updateFormData('uid', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition font-mono"
                      placeholder="CHE-123.456.789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">VAT Number</label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => updateFormData('vatNumber', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition font-mono"
                    placeholder="CHE-123.456.789 MWST"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Address & Contact */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Address & Contact</h2>
                  <p className="text-slate-600">Where is your business located?</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateFormData('address', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="Bahnhofstrasse 1"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      ZIP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => updateFormData('zip', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                      placeholder="8001"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateFormData('city', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                      placeholder="Zürich"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
                  <select
                    value={formData.country}
                    onChange={(e) => updateFormData('country', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                  >
                    <option value="CH">Switzerland</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                      placeholder="+41 44 123 45 67"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.companyEmail}
                      onChange={(e) => updateFormData('companyEmail', e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                      placeholder="info@company.ch"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="https://www.company.ch"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Banking */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Banking Information</h2>
                  <p className="text-slate-600">Required for Swiss QR invoices</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Swiss QR Code Setup</p>
                      <p>Your IBAN enables automatic payment matching and Swiss QR code generation on invoices.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => updateFormData('bankName', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="UBS Switzerland AG"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    IBAN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.iban}
                    onChange={(e) => updateFormData('iban', formatIBAN(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition font-mono text-lg"
                    placeholder="CH93 0076 2011 6238 5295 7"
                    maxLength={26}
                  />
                  <p className="text-xs text-slate-500 mt-1">Swiss IBAN format: CHxx xxxx xxxx xxxx xxxx x</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    QR-IBAN <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.qrIban}
                    onChange={(e) => updateFormData('qrIban', formatIBAN(e.target.value))}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition font-mono text-lg"
                    placeholder="CH44 3199 9123 0008 8901 2"
                    maxLength={26}
                  />
                  <p className="text-xs text-slate-500 mt-1">Optional QR-IBAN for faster payment processing</p>
                </div>
              </div>
            )}

            {/* Step 4: User Account */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Your Account</h2>
                  <p className="text-slate-600">Set up your login credentials</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="john@company.ch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#10B981] focus:border-transparent outline-none transition"
                    placeholder="••••••••"
                  />
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="font-semibold text-slate-900 mb-2">Business Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Default Payment Terms</label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) => updateFormData('paymentTerms', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#10B981] outline-none"
                      >
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Language</label>
                      <select
                        value={formData.defaultLanguage}
                        onChange={(e) => updateFormData('defaultLanguage', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#10B981] outline-none"
                      >
                        <option value="de">Deutsch</option>
                        <option value="fr">Français</option>
                        <option value="it">Italiano</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: QR Test */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Setup Complete!</h2>
                  <p className="text-slate-600">Your InvoSmart account is ready</p>
                </div>

                <div className="bg-gradient-to-br from-[#2C4A6B] to-[#1e3a5f] rounded-xl p-8 text-white text-center">
                  <h3 className="text-xl font-bold mb-2">Welcome to InvoSmart!</h3>
                  <p className="text-blue-100 mb-4">Your professional invoice management starts now</p>
                  <div className="bg-white/10 rounded-lg p-4 mb-4">
                    <p className="text-sm mb-2">Company: <strong>{formData.companyName}</strong></p>
                    <p className="text-sm">IBAN configured: <strong className="font-mono">{formData.iban}</strong></p>
                  </div>
                  {/* Swiss QR Test */}
                  <div className="bg-white rounded-lg p-4 text-slate-900">
                    <h4 className="font-semibold mb-2">Swiss QR Test (SIX Standard)</h4>
                    <p className="text-sm text-slate-600 mb-3">Scan this code with your banking app to verify your setup.</p>
                    {qrCodeImage ? (
                      <div className="flex flex-col items-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCodeImage} alt="Swiss QR Test" className="w-[220px] h-[220px] mb-3 border border-slate-200 rounded" />
                        <div className="text-sm text-slate-600">
                          <div>Amount: CHF 10.00</div>
                          <div>Reference: none (test)</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-200">Generating QR…</div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Next Steps:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-xs font-semibold text-slate-600">1</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Import your customers</p>
                        <p className="text-sm text-slate-600">Upload a CSV or add manually</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-xs font-semibold text-slate-600">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Create your first invoice</p>
                        <p className="text-sm text-slate-600">Generate Swiss QR invoices instantly</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center mr-3 mt-0.5">
                        <span className="text-xs font-semibold text-slate-600">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Import bank payments</p>
                        <p className="text-sm text-slate-600">Automatic payment matching</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-[#10B981] text-white font-semibold py-4 rounded-lg hover:bg-[#059669] transition-all transform hover:scale-[1.02] shadow-lg"
                >
                  Go to Dashboard →
                </button>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-between">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  currentStep === 1
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ← Back
              </button>

              {currentStep === 4 ? (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Complete Setup →'}
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="px-8 py-3 bg-[#10B981] text-white font-semibold rounded-lg hover:bg-[#059669] transition-all"
                >
                  Next →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-slate-600">
            Already have an account?{' '}
            <a href="/" className="text-[#10B981] font-semibold hover:text-[#059669]">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
