"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoiceScreen } from "@/components/invoice-screen"

export default function TestEnhancedInvoice() {
  // Sample invoice data with all enhanced fields for comprehensive testing
  const sampleInvoice = {
    id: 12345,
    customer: {
      id: 14,
      name: "Emily Rodriguez",
      email: "emily.rodriguez@email.com", 
      phone: "+91 98765 43210",
      address: "123 Fashion Street, Bangalore, Karnataka 560001"
    },
    items: [
      {
        id: 1,
        name: "Premium Hair Cut & Styling",
        price: 1500,
        quantity: 1,
        type: "service" as const,
        staff_id: 3,
        staff_name: "Sarah Johnson",
        duration: 90
      },
      {
        id: 2,
        name: "Deep Conditioning Treatment", 
        price: 800,
        quantity: 1,
        type: "service" as const,
        staff_id: 3,
        staff_name: "Sarah Johnson",
        duration: 45
      },
      {
        id: 3,
        name: "Premium Hair Serum",
        price: 450,
        quantity: 2,
        type: "product" as const
      }
    ],
    subtotal: 3200,
    discount: 0, // Manual discount 
    gst: 549, // 18% GST
    total: 3099, // After coupon and loyalty discounts
    payment_method: "card",
    notes: "Customer requested extra conditioning treatment. Appointment includes complementary head massage.",
    created_at: new Date().toISOString(),
    
    // Enhanced fields showing all checkout details
    coupon_code: "WELCOME20",
    coupon_discount: 150,
    loyalty_points_used: 500,
    loyalty_discount: 500,
    gift_card_discount: 0,
    points_earned: 32,
    transaction_id: "TXN123456789",
    staff_name: "Sarah Johnson",
    appointment_date: "2025-01-15",
    appointment_time: "2:30 PM",
    booking_id: 789
  }

  const handleStartNewSale = () => {
    alert("Starting new sale - this would navigate back to the main POS screen")
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enhanced Invoice Screen - Complete Test</CardTitle>
          <p className="text-sm text-muted-foreground">
            This shows the complete invoice screen with all checkout details including:
            <br />• Coupons applied (WELCOME20 - ₹150 off)
            <br />• Loyalty points used (500 points = ₹500 off)  
            <br />• Gift card discounts
            <br />• Transaction details and appointment info
            <br />• Staff details and booking information
            <br />• Points earned from this transaction
            <br />• Customer loyalty and membership information
          </p>
        </CardHeader>
      </Card>
      
      <InvoiceScreen 
        invoice={sampleInvoice} 
        onStartNewSale={handleStartNewSale}
      />
    </div>
  )
}