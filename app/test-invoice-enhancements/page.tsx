"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceTemplate } from "@/components/invoice-template"
import { Download } from "lucide-react"
import { downloadInvoicePDF } from "@/lib/invoice-actions"

export default function TestInvoiceEnhancementsPage() {
  const [downloading, setDownloading] = useState(false)

  // Sample invoice data with loyalty and membership information
  const sampleInvoiceData = {
    invoiceNumber: "INV-2025-001",
    invoiceDate: "2025-01-15",
    dueDate: "2025-02-14",
    customerName: "Priya Sharma",
    customerAddress: "123, MG Road\nBangalore, Karnataka - 560001",
    customerPhone: "+91 98765 43210",
    customerEmail: "priya.sharma@email.com",
    customerGSTIN: "29ABCDE1234F1Z5",
    items: [
      { id: 1, description: "Hair Cut & Styling", quantity: 1, rate: 800, amount: 800 },
      { id: 2, description: "Facial Treatment", quantity: 1, rate: 1200, amount: 1200 },
      { id: 3, description: "Manicure & Pedicure", quantity: 1, rate: 500, amount: 500 },
    ],
    subtotal: 2500,
    discount: 0,
    gstRate: 18,
    isInterState: false,
    placeOfSupply: "Karnataka",
    businessName: "Elite Beauty Salon",
    businessAddress: "456 Business Street\nBangalore, Karnataka - 560001",
    businessPhone: "+91 98765 43210",
    businessEmail: "info@elitebeauty.com",
    businessGSTIN: "29ABCDE1234F1Z5",
    businessPAN: "ABCDE1234F",
    sacCode: "999599",
    // Customer loyalty data
    customerLoyalty: {
      currentPoints: 1250,
      tier: "gold",
      totalEarned: 3200,
      totalRedeemed: 1950
    },
    // Customer membership/package data
    customerMemberships: [
      {
        id: "1",
        name: "Gold Membership",
        status: "Active until Dec 31, 2025",
        endDate: "2025-12-31",
        bookingsUsed: 8,
        discount: 20,
        benefits: [
          "20% discount on all services",
          "Priority booking",
          "Free monthly facial",
          "Complimentary products",
          "Birthday special treatment"
        ],
        isActive: true,
        isExpiring: false
      },
      {
        id: "2",
        name: "Spa Package Premium",
        status: "Expires in 15 days",
        endDate: "2025-01-30",
        bookingsUsed: 3,
        discount: 0,
        benefits: [
          "5 premium spa sessions",
          "Full body massage included",
          "Aromatherapy treatment"
        ],
        isActive: true,
        isExpiring: true
      }
    ],
    // Additional invoice enhancements
    paymentMethod: "Credit Card",
    transactionId: "TXN123456789",
    couponsApplied: 250,
    loyaltyPointsUsed: 500,
    notes: "Customer requested extra conditioning treatment. Appointment includes complementary head massage.",
    staffName: "Sarah Johnson",
    appointmentDate: "2025-01-15",
    appointmentTime: "2:30 PM"
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadInvoicePDF(sampleInvoiceData)
    } catch (error) {
      console.error("Error downloading invoice:", error)
      alert("Failed to download invoice. Please try again.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Invoice Preview</CardTitle>
            <p className="text-sm text-muted-foreground">
              This preview shows the new loyalty points and membership information sections added to invoices.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end mb-4">
              <Button onClick={handleDownload} disabled={downloading} className="gap-2">
                <Download className="w-4 h-4" />
                {downloading ? "Downloading..." : "Download PDF"}
              </Button>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
              <InvoiceTemplate data={sampleInvoiceData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}