"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, Download, Printer as Print, Share, Plus, User, CreditCard } from "lucide-react"
import { downloadInvoicePDF } from "@/lib/invoice-actions"

interface Customer {
  id: number
  name: string
  email: string
  phone: string
  address: string
}

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  type: "service" | "product" | "package" | "membership"
  staff_id?: number
  staff_name?: string
  duration?: number
  validityDays?: number
}

// Interface for customer loyalty data
interface CustomerLoyalty {
  currentPoints: number
  tier: string
  totalEarned: number
  totalRedeemed: number
}

// Interface for customer membership data
interface CustomerMembership {
  id: string
  name: string
  status: string
  endDate: string
  bookingsUsed: number
  discount: number
  benefits: string[]
  isActive: boolean
  isExpiring: boolean
}

interface Invoice {
  id: number
  customer: Customer
  items: CartItem[]
  subtotal: number
  discount: number
  gst: number
  total: number
  payment_method: string
  notes?: string
  created_at: string
  // Enhanced fields for comprehensive invoice details
  coupon_code?: string
  coupon_discount?: number
  loyalty_points_used?: number
  loyalty_discount?: number
  gift_card_discount?: number
  points_earned?: number
  transaction_id?: string
  staff_name?: string
  appointment_date?: string
  appointment_time?: string
  booking_id?: number
}

interface InvoiceScreenProps {
  invoice: Invoice
  onStartNewSale: () => void
}

export function InvoiceScreen({ invoice, onStartNewSale }: InvoiceScreenProps) {
  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [customerLoyalty, setCustomerLoyalty] = useState<CustomerLoyalty | null>(null)
  const [customerMemberships, setCustomerMemberships] = useState<CustomerMembership[]>([])  
  const [businessSettings, setBusinessSettings] = useState<any>(null)

  // Load customer data when component mounts
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const response = await fetch(`/api/loyalty/customer-invoice?customerId=${invoice.customer.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setCustomerLoyalty(data.data.loyalty)
            setCustomerMemberships(data.data.memberships || [])
          }
        }
      } catch (error) {
        console.log('Could not fetch customer data:', error)
      }
    }
    
    // Load business settings for tenant name
    const loadBusinessSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setBusinessSettings(data.settings)
          }
        }
      } catch (error) {
        console.log('Could not fetch business settings:', error)
      }
    }
    
    loadCustomerData()
    loadBusinessSettings()
  }, [invoice.customer.id])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const invoiceData = await prepareInvoiceData()
      await downloadInvoicePDF(invoiceData)
    } catch (error) {
      console.error("Error downloading invoice:", error)
      alert("Failed to download invoice. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    try {
      // Generate PDF and open it in a new window for printing
      const invoiceData = await prepareInvoiceData()
      
      // Call the PDF generation API
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceData }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.htmlContent) {
          // Create a new window with the PDF content
          const printWindow = window.open('', '_blank')
          if (printWindow) {
            printWindow.document.write(result.htmlContent)
            printWindow.document.close()
            
            // Wait for content to load then print
            printWindow.onload = () => {
              setTimeout(() => {
                printWindow.print()
                printWindow.close()
              }, 500)
            }
          }
        } else {
          alert('Failed to generate printable invoice')
        }
      } else {
        alert('Failed to generate printable invoice')
      }
    } catch (error) {
      console.error("Error printing invoice:", error)
      alert('Failed to print invoice. Please try again.')
    } finally {
      setPrinting(false)
    }
  }

  const handleShare = async () => {
    try {
      // Get tenant name from business settings
      const tenantName = businessSettings?.profile?.salonName || 'Your Business'
      
      // Format invoice generation date and time
      const invoiceDate = new Date(invoice.created_at)
      const dateTime = invoiceDate.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      // Create download link for the invoice
      const currentUrl = window.location.origin
      const invoiceDownloadLink = `${currentUrl}/invoice/${invoice.id}/download`
      
      // Create WhatsApp message with template
      const whatsappMessage = `Hi ${invoice.customer.name},

Your appointment at ${tenantName} on ${dateTime} is Completed.

Please rate us on Google: https://maps.app.goo.gl/E5F1vmBfu7sBZj6BA?g_st=iw

Here is your invoice: ${invoiceDownloadLink}

Sincerely,
The team at ${tenantName}`
      
      // Format phone number for WhatsApp (remove any non-digits and country code handling)
      let phoneNumber = invoice.customer.phone.replace(/[^\d]/g, '')
      
      // If phone number doesn't start with country code, assume Indian number
      if (phoneNumber.length === 10) {
        phoneNumber = '91' + phoneNumber
      }
      
      // Create WhatsApp URL
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank')
      
    } catch (error) {
      console.error("Error sharing invoice:", error)
      // Fallback to regular share API if available
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Invoice #${invoice.id}`,
            text: `Invoice for ${invoice.customer.name} - Total: ₹${invoice.total}`,
            url: window.location.href,
          })
        } catch (shareError) {
          console.error("Error with native share:", shareError)
          // Final fallback - copy to clipboard
          navigator.clipboard.writeText(window.location.href)
          alert("Invoice link copied to clipboard!")
        }
      } else {
        // Fallback for browsers that don't support Web Share API
        navigator.clipboard.writeText(window.location.href)
        alert("Invoice link copied to clipboard!")
      }
    }
  }

  // Helper function to prepare invoice data for PDF generation
  const prepareInvoiceData = async () => {
    // Fetch customer loyalty and membership data if not already loaded
    let loyaltyData = customerLoyalty
    let membershipData = customerMemberships
    
    if (!loyaltyData || !membershipData) {
      try {
        const customerResponse = await fetch(`/api/loyalty/customer-invoice?customerId=${invoice.customer.id}`)
        if (customerResponse.ok) {
          const customerData = await customerResponse.json()
          if (customerData.success) {
            loyaltyData = customerData.data.loyalty
            membershipData = customerData.data.memberships
          }
        }
      } catch (error) {
        console.log('Could not fetch customer loyalty/membership data:', error)
      }
    }
    
    return {
      invoiceNumber: invoice.id.toString(),
      invoiceDate: invoice.created_at,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerName: invoice.customer.name,
      customerAddress: invoice.customer.address,
      customerPhone: invoice.customer.phone,
      customerEmail: invoice.customer.email,
      items: invoice.items.map((item, index) => ({
        id: index + 1,
        description: item.name,
        quantity: item.quantity,
        rate: item.price,
        amount: item.price * item.quantity,
        duration: item.duration,
        staff_name: item.staff_name,
      })),
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      gstRate: 18,
      placeOfSupply: "Karnataka",
      paymentMethod: invoice.payment_method,
      notes: invoice.notes,
      staffName: invoice.items.find(item => item.staff_name)?.staff_name,
      customerLoyalty: loyaltyData,
      customerMemberships: membershipData,
      // Enhanced checkout details
      couponCode: invoice.coupon_code,
      couponDiscount: invoice.coupon_discount,
      loyaltyPointsUsed: invoice.loyalty_points_used,
      loyaltyDiscount: invoice.loyalty_discount,
      giftCardDiscount: invoice.gift_card_discount,
      pointsEarned: invoice.points_earned,
      transactionId: invoice.transaction_id,
      appointmentDate: invoice.appointment_date,
      appointmentTime: invoice.appointment_time,
      bookingId: invoice.booking_id,
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "card":
        return <CreditCard className="w-4 h-4" />
      case "cash":
        return <span className="w-4 h-4 text-center">💵</span>
      case "upi":
        return <span className="w-4 h-4 text-center">📱</span>
      default:
        return <CreditCard className="w-4 h-4" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Success Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h1>
          <p className="text-green-700">Invoice #{invoice.id} has been generated successfully</p>
        </CardContent>
      </Card>

      {/* Invoice Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">Invoice #{invoice.id}</CardTitle>
                  <p className="text-gray-600">
                    Generated on{" "}
                    {new Date(invoice.created_at).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <Badge className="bg-green-600">Paid</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{invoice.customer.name}</p>
                  <p className="text-sm text-gray-600">{invoice.customer.phone}</p>
                  {invoice.customer.email && <p className="text-sm text-gray-600">{invoice.customer.email}</p>}
                  {invoice.customer.address && <p className="text-sm text-gray-600">{invoice.customer.address}</p>}
                </div>
              </div>

              {/* Customer Loyalty Points */}
              {customerLoyalty && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-yellow-500">⭐</span>
                    Loyalty Rewards
                  </h3>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">Available Points:</span>
                          <span className="font-bold text-green-600 text-lg">{customerLoyalty.currentPoints.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Membership Tier:</span>
                          <span className="capitalize font-semibold text-purple-600">{customerLoyalty.tier}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm">Total Earned:</span>
                          <span className="font-medium">{customerLoyalty.totalEarned.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Total Redeemed:</span>
                          <span className="font-medium">{customerLoyalty.totalRedeemed.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border-l-4 border-yellow-400">
                      💡 Earn more points with every visit and redeem for exciting rewards!
                    </div>
                  </div>
                </div>
              )}

              {/* Customer Memberships & Packages */}
              {customerMemberships && customerMemberships.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <span className="text-purple-500">👑</span>
                    Active Memberships & Packages
                  </h3>
                  <div className="space-y-3">
                    {customerMemberships.map((membership) => (
                      <div key={membership.id} 
                           className={`border-l-4 pl-4 py-3 bg-white rounded-r-lg border ${
                             membership.isActive ? 'border-l-green-500 bg-green-50' : 
                             membership.isExpiring ? 'border-l-yellow-500 bg-yellow-50' : 
                             'border-l-red-500 bg-red-50'
                           }`}>
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-800">{membership.name}</div>
                          <div className={`text-xs px-2 py-1 rounded-full ${
                            membership.isActive ? 'bg-green-100 text-green-800' : 
                            membership.isExpiring ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {membership.status}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-2">
                          {membership.discount > 0 && (
                            <div className="mb-1">💸 {membership.discount}% discount on all services</div>
                          )}
                          {membership.bookingsUsed > 0 && (
                            <div>📅 {membership.bookingsUsed} bookings used</div>
                          )}
                        </div>
                        
                        {membership.benefits && membership.benefits.length > 0 && (
                          <div className="text-xs">
                            <div className="font-medium mb-1 text-gray-700">Benefits:</div>
                            <div className="text-gray-600 space-y-1">
                              {membership.benefits.slice(0, 2).map((benefit, index) => (
                                <div key={index} className="flex items-start gap-1">
                                  <span className="text-green-500 text-xs">•</span>
                                  <span>{benefit}</span>
                                </div>
                              ))}
                              {membership.benefits.length > 2 && (
                                <div className="text-gray-500 italic">+{membership.benefits.length - 2} more benefits</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="text-xs text-gray-600 bg-purple-50 p-3 rounded border-l-4 border-purple-400">
                      🎯 Thank you for being a valued member! Enjoy exclusive benefits and priority service.
                    </div>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Items & Services</h3>
                <div className="space-y-3">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatCurrency(item.price)} × {item.quantity}
                          {item.staff_name && <span className="ml-2">• Staff: {item.staff_name}</span>}
                          {item.duration && <span className="ml-2">• {item.duration} min</span>}
                        </div>
                      </div>
                      <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Payment Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getPaymentMethodIcon(invoice.payment_method)}
                    <span className="font-medium capitalize">{invoice.payment_method} Payment</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Paid on {new Date(invoice.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div>
                  <h3 className="font-semibold mb-3">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">{invoice.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bill Summary - Enhanced with all checkout details */}
          <Card>
            <CardHeader>
              <CardTitle>Bill Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>

                {/* Manual discount */}
                {invoice.discount > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Manual Discount:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}

                {/* Coupon discount */}
                {invoice.coupon_code && invoice.coupon_discount && invoice.coupon_discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon ({invoice.coupon_code}):</span>
                    <span>-{formatCurrency(invoice.coupon_discount)}</span>
                  </div>
                )}

                {/* Loyalty points used */}
                {invoice.loyalty_points_used && invoice.loyalty_points_used > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      Loyalty Points ({invoice.loyalty_points_used} pts)
                    </span>
                    <span>-{formatCurrency(invoice.loyalty_discount || invoice.loyalty_points_used)}</span>
                  </div>
                )}

                {/* Gift card discount */}
                {invoice.gift_card_discount && invoice.gift_card_discount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Gift Card Applied:</span>
                    <span>-{formatCurrency(invoice.gift_card_discount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>GST (18%):</span>
                  <span>{formatCurrency(invoice.gst)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>

                {/* Points earned */}
                {invoice.points_earned && invoice.points_earned > 0 && (
                  <div className="flex justify-between text-green-600 text-sm bg-green-50 p-2 rounded">
                    <span className="flex items-center gap-1">
                      <span className="text-yellow-500">⭐</span>
                      Points Earned:
                    </span>
                    <span className="font-semibold">+{invoice.points_earned}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction & Checkout Details */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Invoice ID:</span>
                <span className="font-mono">#{invoice.id}</span>
              </div>
              
              {invoice.transaction_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-xs">{invoice.transaction_id}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Items Count:</span>
                <span>{invoice.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Method:</span>
                <span className="capitalize flex items-center gap-1">
                  {getPaymentMethodIcon(invoice.payment_method)}
                  {invoice.payment_method}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Time:</span>
                <span>{new Date(invoice.created_at).toLocaleTimeString()}</span>
              </div>

              {invoice.appointment_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Appointment:</span>
                  <span className="text-right">
                    {new Date(invoice.appointment_date).toLocaleDateString()}
                    {invoice.appointment_time && <br />}{invoice.appointment_time}
                  </span>
                </div>
              )}

              {invoice.staff_name && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Staff:</span>
                  <span>{invoice.staff_name}</span>
                </div>
              )}

              {invoice.booking_id && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-mono">#{invoice.booking_id}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleDownload} disabled={downloading} className="w-full gap-2">
                <Download className="w-4 h-4" />
                {downloading ? "Generating PDF..." : "Download PDF"}
              </Button>

              <Button
                onClick={handlePrint}
                disabled={printing}
                variant="outline"
                className="w-full gap-2 bg-transparent"
              >
                <Print className="w-4 h-4" />
                {printing ? "Preparing..." : "Print Invoice"}
              </Button>

              <Button onClick={handleShare} variant="outline" className="w-full gap-2 bg-transparent">
                <Share className="w-4 h-4" />
                Share Invoice
              </Button>

              <Separator />

              <Button onClick={onStartNewSale} className="w-full gap-2 bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4" />
                Start New Sale
              </Button>
            </CardContent>
          </Card>

          {/* Checkout Summary - Applied Discounts & Rewards */}
          {(invoice.coupon_code || invoice.loyalty_points_used || invoice.gift_card_discount) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Applied Discounts & Rewards</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.coupon_code && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-green-600">🎟️</span>
                      <span className="font-medium text-green-800">Coupon Applied</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Code: <span className="font-mono bg-green-100 px-1 rounded">{invoice.coupon_code}</span>
                      {invoice.coupon_discount && (
                        <span className="float-right text-green-600 font-medium">
                          -{formatCurrency(invoice.coupon_discount)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {invoice.loyalty_points_used && invoice.loyalty_points_used > 0 && (
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-yellow-500">⭐</span>
                      <span className="font-medium text-purple-800">Loyalty Points Redeemed</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Points Used: <span className="font-semibold">{invoice.loyalty_points_used}</span>
                      <span className="float-right text-purple-600 font-medium">
                        -{formatCurrency(invoice.loyalty_discount || invoice.loyalty_points_used)}
                      </span>
                    </div>
                  </div>
                )}

                {invoice.gift_card_discount && invoice.gift_card_discount > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-600">🎁</span>
                      <span className="font-medium text-blue-800">Gift Card Applied</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Gift Card Credit
                      <span className="float-right text-blue-600 font-medium">
                        -{formatCurrency(invoice.gift_card_discount)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
