import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "@/lib/db"
import { getBusinessSettings } from "@/app/actions/settings"

// Import the HTML generation function from the main generate route
function generateInvoiceHTML(data: any): string {
  // Calculate amounts safely
  const subtotal = data.subtotal || 0
  const discount = data.discount || 0
  const gstRate = data.gstRate || 18
  
  // Handle additional discounts properly
  const couponsApplied = data.couponsApplied || 0
  const loyaltyPointsUsed = data.loyaltyPointsUsed || 0
  const loyaltyDiscount = data.loyaltyDiscount || (loyaltyPointsUsed * 0.1) // 1 point = 0.1 currency unit (10 points = 1 Rs)
  
  const totalDiscounts = discount + couponsApplied + loyaltyDiscount
  const taxableAmount = Math.max(0, subtotal - totalDiscounts)
  const gstAmount = taxableAmount * (gstRate / 100)
  const totalAmount = taxableAmount + gstAmount

  // Use plain text currency identifier to avoid PDF rendering issues
  const currencySymbol = 'Rs. '

  // Ensure we have valid items array
  const items = Array.isArray(data.items) ? data.items : []
  
  // Fix loyalty data - ensure we get correct values
  const loyaltyData = data.customerLoyalty || {
    currentPoints: 0,
    tier: 'bronze',
    totalEarned: 0,
    totalRedeemed: 0
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 15px; 
          color: #333; 
          background: white;
          line-height: 1.3;
          font-size: 11px;
          width: 100%;
          max-width: 8.5in;
        }
        .invoice-container { 
          max-width: 100%; 
          width: 100%;
          margin: 0 auto; 
          background: white;
          padding: 0;
        }
        .header { 
          background: #667eea;
          color: white;
          text-align: center; 
          padding: 15px;
          margin-bottom: 15px;
        }
        .business-name { 
          font-size: 24px; 
          font-weight: bold; 
          margin-bottom: 8px;
        }
        .business-details { 
          font-size: 12px; 
          margin-top: 10px;
        }
        .content-section {
          padding: 0 15px;
        }
        .invoice-info { 
          width: 100%;
          margin-bottom: 15px;
          border: 1px solid #ddd;
        }
        .invoice-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .customer-info, .invoice-details {
          width: 50%;
          padding: 12px;
          background: #f9f9f9;
          vertical-align: top;
          border: none;
        }
        .invoice-details {
          text-align: right;
        }
        .invoice-number {
          font-size: 20px;
          font-weight: bold;
          color: #667eea;
          margin-bottom: 8px;
        }
        .services-section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #333;
          margin-bottom: 15px;
          padding-bottom: 5px;
          border-bottom: 2px solid #667eea;
        }
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px; 
          font-size: 12px;
        }
        .items-table th { 
          background: #667eea;
          color: white;
          padding: 10px 8px;
          font-weight: bold;
          text-align: left;
          border: 1px solid #667eea;
        }
        .items-table td { 
          padding: 8px;
          border: 1px solid #ddd;
        }
        .items-table .text-right { 
          text-align: right; 
        }
        .items-table .text-center { 
          text-align: center; 
        }
        .summary-section {
          width: 100%;
          margin-bottom: 15px;
        }
        .summary-section table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 10px;
        }
        .totals { 
          width: 100%;
          background: white;
          border: 1px solid #ddd;
          vertical-align: top;
          margin-top: 15px;
        }
        .totals-header {
          background: #667eea;
          color: white;
          padding: 10px 15px;
          font-weight: bold;
          font-size: 14px;
        }
        .totals-body {
          padding: 15px;
        }
        .totals-row { 
          width: 100%;
          padding: 5px 0; 
          border-bottom: 1px solid #eee;
          font-size: 11px;
        }
        .totals-row table {
          width: 100%;
          border-collapse: collapse;
        }
        .totals-row td:first-child {
          text-align: left;
        }
        .totals-row td:last-child {
          text-align: right;
        }
        .totals-row.total { 
          font-weight: bold; 
          border-top: 2px solid #667eea; 
          padding-top: 10px;
          margin-top: 8px;
          font-size: 14px;
          color: #667eea;
        }
        .footer { 
          background: #2c3e50;
          color: white;
          text-align: center; 
          padding: 15px;
          font-size: 10px;
          margin-top: 20px;
        }
        @media print {
          body { 
            background: white;
            padding: 0;
            font-size: 10px;
            margin: 0;
            width: 100%;
            max-width: none;
          }
          .invoice-container { 
            max-width: none;
            width: 100%;
            padding: 0;
            margin: 0;
          }
          .header {
            background: #667eea !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            page-break-inside: avoid;
          }
          .totals-header, .items-table th {
            background: #667eea !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Modern Header -->
        <div class="header">
          <div class="business-name">${escapeHtml(data.businessName || 'Your Business')}</div>
          <div class="business-details">
            ${escapeHtml(data.businessAddress || 'Business Address')}<br>
            ${escapeHtml(data.businessPhone || 'Phone Number')} | ${escapeHtml(data.businessEmail || 'email@business.com')}
          </div>
        </div>

        <div class="content-section">
          <!-- Invoice Information -->
          <div class="invoice-info">
            <table>
              <tr>
                <td class="customer-info">
                  <h3>Bill To</h3>
                  <p><strong>${escapeHtml(data.customerName || 'Customer Name')}</strong></p>
                  ${data.customerAddress ? `<p>${escapeHtml(data.customerAddress)}</p>` : ""}
                  ${data.customerPhone ? `<p>Phone: ${escapeHtml(data.customerPhone)}</p>` : ""}
                  ${data.customerEmail ? `<p>Email: ${escapeHtml(data.customerEmail)}</p>` : ""}
                </td>
                <td class="invoice-details">
                  <div class="invoice-number">#${escapeHtml(data.invoiceNumber || 'INV-001')}</div>
                  <p><strong>Invoice Date:</strong> ${formatDate(data.invoiceDate)}</p>
                  <p><strong>Payment Status:</strong> <span style="color: #28a745; font-weight: bold;">Paid</span></p>
                </td>
              </tr>
            </table>
          </div>

          <!-- Services Section -->
          <div class="services-section">
            <h2 class="section-title">Services & Products</h2>
            <table class="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Service/Product</th>
                  <th class="text-center">Qty</th>
                  <th class="text-right">Rate</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.length > 0 ? items
                  .map(
                    (item: any, index: number) => `
                  <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>
                      <strong>${escapeHtml(item.description || item.name || 'Service/Product')}</strong>
                      ${item.duration ? `<br><small style="color: #666;">Duration: ${item.duration}</small>` : ""}
                    </td>
                    <td class="text-center">${formatNumber(item.quantity || 1)}</td>
                    <td class="text-right">${currencySymbol}${formatNumber(item.rate || item.price || 0)}</td>
                    <td class="text-right"><strong>${currencySymbol}${formatNumber(item.amount || (item.quantity || 1) * (item.rate || item.price || 0))}</strong></td>
                  </tr>
                `,
                  )
                  .join("") : `
                  <tr>
                    <td class="text-center">1</td>
                    <td><strong>Salon Service</strong></td>
                    <td class="text-center">1</td>
                    <td class="text-right">${currencySymbol}${formatNumber(subtotal)}</td>
                    <td class="text-right"><strong>${currencySymbol}${formatNumber(subtotal)}</strong></td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Payment Summary -->
          <div class="totals">
            <div class="totals-header">Payment Summary</div>
            <div class="totals-body">
              <div class="totals-row">
                <table><tr><td>Subtotal:</td><td>${currencySymbol}${formatNumber(subtotal)}</td></tr></table>
              </div>
              ${
                discount > 0
                  ? `
                <div class="totals-row">
                  <table><tr><td>Discount Applied:</td><td style="color: #28a745;">-${currencySymbol}${formatNumber(discount)}</td></tr></table>
                </div>
              `
                  : ""
              }
              ${data.couponsApplied ? `
                <div class="totals-row">
                  <table><tr><td>Coupon Discount:</td><td style="color: #28a745;">-${currencySymbol}${formatNumber(data.couponsApplied)}</td></tr></table>
                </div>
              ` : ""}
              ${data.loyaltyPointsUsed ? `
                <div class="totals-row">
                  <table><tr><td>Loyalty Points Used:</td><td style="color: #667eea;">${data.loyaltyPointsUsed} pts (-${currencySymbol}${formatNumber(loyaltyDiscount)})</td></tr></table>
                </div>
              ` : ""}
              <div class="totals-row">
                <table><tr><td>GST (${gstRate}%):</td><td>${currencySymbol}${formatNumber(gstAmount)}</td></tr></table>
              </div>
              <div class="totals-row total">
                <table><tr><td>Total Paid:</td><td>${currencySymbol}${formatNumber(totalAmount)}</td></tr></table>
              </div>
            </div>
          </div>

          <!-- Thank You Section -->
          <div style="text-align: center; margin: 20px 0; padding: 15px; background: #667eea; color: white;">
            <h3 style="color: white; margin-bottom: 8px; font-size: 14px;">Thank you for choosing ${escapeHtml(data.businessName || 'Your Business')}!</h3>
            <p style="margin: 0; font-size: 12px;">We appreciate your business and look forward to serving you again.</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p><strong>Thank you for choosing ${escapeHtml(data.businessName || 'Your Business')}!</strong></p>
          <p style="margin: 8px 0;">Follow us on social media for latest updates and exclusive offers!</p>
          <p style="margin-top: 10px; opacity: 0.8; font-size: 10px;">This is a digitally generated invoice. No physical signature required.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Helper function to format dates
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-IN", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return new Date().toLocaleDateString("en-IN")
  }
}

// Helper function to format numbers with 2 decimal places
function formatNumber(num: number): string {
  return parseFloat(num.toString()).toFixed(2)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authentication details
    const { userId, orgId, orgSlug } = await auth()

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "Organization required" }, { status: 401 })
    }

    const tenantKey = orgSlug ?? orgId
    const { sql, tenantId } = await getAuthenticatedSql(tenantKey)

    const invoiceId = params.id

    // Fetch invoice from database
    const invoiceResult = await sql`
      SELECT 
        i.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ${invoiceId} AND i.tenant_id = ${tenantId}
    `

    if (invoiceResult.length === 0) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 })
    }

    const invoice = invoiceResult[0]

    // Fetch invoice items
    const itemsResult = await sql`
      SELECT 
        ii.*,
        s.name as service_name,
        st.name as staff_name
      FROM invoice_items ii
      LEFT JOIN services s ON ii.service_id = s.id
      LEFT JOIN staff st ON ii.staff_id = st.id
      WHERE ii.invoice_id = ${invoiceId}
    `

    // Get business settings
    let businessSettings
    try {
      businessSettings = await getBusinessSettings()
    } catch (error) {
      console.error("Error fetching business settings:", error)
      businessSettings = {
        profile: {
          salonName: "Your Business",
          address: "Business Address",
          phone: "Phone Number",
          email: "email@business.com",
        },
        business: {
          taxRate: 18,
          currency: "INR",
        },
      }
    }

    // Prepare invoice data
    const invoiceData = {
      invoiceNumber: invoice.id.toString(),
      invoiceDate: invoice.created_at,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerName: invoice.customer_name,
      customerAddress: invoice.customer_address,
      customerPhone: invoice.customer_phone,
      customerEmail: invoice.customer_email,
      items: itemsResult.map((item: any, index: number) => ({
        id: index + 1,
        description: item.service_name || item.description || 'Service',
        quantity: item.quantity || 1,
        rate: item.price || 0,
        amount: (item.quantity || 1) * (item.price || 0),
        duration: item.duration,
        staff_name: item.staff_name,
      })),
      subtotal: invoice.subtotal || 0,
      discount: invoice.discount || 0,
      gstRate: 18,
      placeOfSupply: "Karnataka",
      paymentMethod: invoice.payment_method,
      notes: invoice.notes,
      // Enhanced checkout details
      couponCode: invoice.coupon_code,
      couponDiscount: invoice.coupon_discount || 0,
      loyaltyPointsUsed: invoice.loyalty_points_used || 0,
      loyaltyDiscount: invoice.loyalty_discount || 0,
      giftCardDiscount: invoice.gift_card_discount || 0,
      pointsEarned: invoice.points_earned || 0,
      transactionId: invoice.transaction_id,
      appointmentDate: invoice.appointment_date,
      appointmentTime: invoice.appointment_time,
      bookingId: invoice.booking_id,
      businessName: businessSettings?.profile?.salonName || "Your Business",
      businessAddress: businessSettings?.profile?.address || "Business Address",
      businessPhone: businessSettings?.profile?.phone || "Phone Number",
      businessEmail: businessSettings?.profile?.email || "email@business.com",
      businessGSTIN: businessSettings?.business?.gstin || "29ABCDE1234F1Z5",
      businessPAN: businessSettings?.business?.pan || "ABCDE1234F",
      currency: businessSettings?.business?.currency || "INR",
    }

    // Generate HTML content for PDF
    const htmlContent = generateInvoiceHTML(invoiceData)

    // Return HTML content with proper headers for PDF generation
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoiceId}.html"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })

  } catch (error) {
    console.error("Error generating invoice download:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate invoice",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}