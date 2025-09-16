import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "@/lib/db"
import { getBusinessSettings } from "@/app/actions/settings"

export async function POST(request: NextRequest) {
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

    const { invoiceData } = await request.json()

    // Validate input data
    if (!invoiceData || !invoiceData.items || !Array.isArray(invoiceData.items)) {
      return NextResponse.json(
        { success: false, message: "Invalid invoice data" },
        { status: 400 }
      )
    }

    let businessSettings
    try {
      businessSettings = await getBusinessSettings()
    } catch (error) {
      console.error("Error fetching business settings:", error)
      // Fallback to default values if business settings can't be fetched
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

    const completeInvoiceData = {
      ...invoiceData,
      businessName: (businessSettings as any)?.profile?.salonName || "Your Business",
      businessAddress: (businessSettings as any)?.profile?.address || "Business Address",
      businessPhone: (businessSettings as any)?.profile?.phone || "Phone Number",
      businessEmail: (businessSettings as any)?.profile?.email || "email@business.com",
      businessGSTIN: (businessSettings as any)?.business?.gstin || "29ABCDE1234F1Z5",
      businessPAN: (businessSettings as any)?.business?.pan || "ABCDE1234F",
      gstRate: (businessSettings as any)?.business?.taxRate || 18,
      currency: (businessSettings as any)?.business?.currency || "INR",
    }

    // Generate HTML content with proper error handling
    let htmlContent
    try {
      htmlContent = generateInvoiceHTML(completeInvoiceData)
    } catch (error) {
      console.error("Error generating HTML:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Failed to generate invoice HTML",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      htmlContent,
      invoiceData: completeInvoiceData,
    })
  } catch (error) {
    console.error("Error generating invoice data:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate invoice data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

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
        .additional-info {
          width: 60%;
          background: #f9f9f9;
          padding: 12px;
          vertical-align: top;
          border: 1px solid #ddd;
        }
        .totals { 
          width: 40%;
          background: white;
          border: 1px solid #ddd;
          vertical-align: top;
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
        .loyalty-section, .memberships-section {
          margin-bottom: 20px;
          border: 1px solid #ddd;
          padding: 15px;
          background: #f9f9f9;
        }
        .loyalty-section h3, .memberships-section h3 {
          color: #667eea;
          margin-bottom: 15px;
          font-size: 14px;
          font-weight: bold;
        }
        .loyalty-grid {
          width: 100%;
        }
        .loyalty-grid table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 10px;
        }
        .loyalty-col {
          width: 50%;
          vertical-align: top;
        }
        .loyalty-item {
          width: 100%;
          margin-bottom: 3px;
        }
        .loyalty-item table {
          width: 100%;
          border-collapse: collapse;
        }
        .loyalty-item td:first-child {
          font-weight: bold;
          width: 60%;
        }
        .loyalty-item td:last-child {
          text-align: right;
        }
        .rating-section {
          text-align: center;
          margin: 20px 0;
          padding: 15px;
          background: #667eea;
          color: white;
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
          .loyalty-section, .memberships-section {
            page-break-inside: avoid;
          }
          .summary-section {
            page-break-inside: avoid;
          }
          .items-table {
            page-break-inside: auto;
          }
          .items-table tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Modern Header with Logo -->
        <div class="header">
          <div class="logo-circle">${escapeHtml((data.businessName || 'YB').charAt(0))}</div>
          <div class="business-name">${escapeHtml(data.businessName || 'Your Business')}</div>
          <div class="business-tagline">Premium Salon & Spa Services</div>
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
                  <p><strong>Due Date:</strong> ${formatDate(data.dueDate)}</p>
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

          <!-- Summary Section -->
          <div class="summary-section">
            <table>
              <tr>
                <td class="additional-info">
                  <h3 style="color: #667eea; margin-bottom: 15px;">Service Details</h3>
                  <p><strong>Stylist:</strong> ${escapeHtml(data.stylist || data.staffName || 'Professional Stylist')}</p>
                  <p><strong>Service Time:</strong> ${data.serviceTime || data.duration || '2 hours'}</p>
                  ${data.appointmentDate ? `<p><strong>Appointment Date:</strong> ${formatDate(data.appointmentDate)}</p>` : ""}
                  ${data.appointmentTime ? `<p><strong>Appointment Time:</strong> ${escapeHtml(data.appointmentTime)}</p>` : ""}
                  <p><strong>Next Appointment:</strong> Book online or call us!</p>
                  <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
                  <h4 style="color: #667eea; margin: 15px 0 10px 0;">Business Information</h4>
                  ${data.businessGSTIN ? `<p><strong>GSTIN:</strong> ${escapeHtml(data.businessGSTIN)}</p>` : ""}
                  ${data.businessPAN ? `<p><strong>PAN:</strong> ${escapeHtml(data.businessPAN)}</p>` : ""}
                  <p><strong>SAC Code:</strong> 999599</p>
                </td>
                
                <td class="totals">
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
                </td>
              </tr>
            </table>
          </div>

          <!-- Customer Loyalty Points Section -->
          ${data.customerLoyalty ? `
          <div class="loyalty-section" style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; background: #f8f9fa;">
            <h3 style="color: #667eea; margin-bottom: 15px;">
              <span style="font-size: 16px;">⭐</span>
              Loyalty Rewards
            </h3>
            <div class="loyalty-grid">
              <table>
                <tr>
                  <td class="loyalty-col">
                    <div class="loyalty-item">
                      <table><tr><td><strong>Available Points:</strong></td><td style="font-weight: bold; color: #28a745;">${data.customerLoyalty.currentPoints.toLocaleString()}</td></tr></table>
                    </div>
                    <div class="loyalty-item">
                      <table><tr><td>Membership Tier:</td><td style="text-transform: capitalize; font-weight: 600;">${data.customerLoyalty.tier}</td></tr></table>
                    </div>
                  </td>
                  <td class="loyalty-col">
                    <div class="loyalty-item">
                      <table><tr><td>Total Earned:</td><td>${data.customerLoyalty.totalEarned.toLocaleString()}</td></tr></table>
                    </div>
                    <div class="loyalty-item">
                      <table><tr><td>Total Redeemed:</td><td>${data.customerLoyalty.totalRedeemed.toLocaleString()}</td></tr></table>
                    </div>
                  </td>
                </tr>
              </table>
            </div>
            <p style="font-size: 11px; color: #666; margin-top: 10px;">
              💡 Earn more points with every visit and redeem for exciting rewards!
            </p>
          </div>
          ` : ""}

          <!-- Customer Memberships & Packages Section -->
          ${data.customerMemberships && data.customerMemberships.length > 0 ? `
          <div class="memberships-section" style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; background: #f8f9fa;">
            <h3 style="color: #667eea; margin-bottom: 15px;">
              <span style="font-size: 16px;">👑</span>
              Active Memberships & Packages
            </h3>
            <div style="margin-bottom: 10px;">
              ${data.customerMemberships.map((membership: any, index: number) => `
                <div style="border-left: 4px solid ${membership.isActive ? '#10B981' : membership.isExpiring ? '#F59E0B' : '#EF4444'}; padding: 10px; background: white; margin-bottom: 10px; ${index < data.customerMemberships.length - 1 ? '' : 'margin-bottom: 0;'}">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="font-weight: 600; font-size: 14px; width: 70%;">${membership.name}</td>
                      <td style="text-align: right; font-size: 11px; padding: 2px 8px; background: ${membership.isActive ? '#D1FAE5; color: #065F46' : membership.isExpiring ? '#FEF3C7; color: #92400E' : '#FEE2E2; color: #991B1B'}; border-radius: 10px;">
                        ${membership.status}
                      </td>
                    </tr>
                  </table>
                  
                  <div style="font-size: 11px; color: #666; margin: 5px 0;">
                    ${membership.discount > 0 ? `<div>💸 ${membership.discount}% discount on all services</div>` : ""}
                    ${membership.bookingsUsed > 0 ? `<div>📅 ${membership.bookingsUsed} bookings used</div>` : ""}
                  </div>
                  
                  ${membership.benefits && membership.benefits.length > 0 ? `
                    <div style="font-size: 11px;">
                      <div style="font-weight: 600; margin-bottom: 3px;">Benefits:</div>
                      <ul style="margin: 0; padding-left: 12px; color: #666;">
                        ${membership.benefits.slice(0, 3).map((benefit: string) => `<li style="margin-bottom: 1px;">${benefit}</li>`).join('')}
                        ${membership.benefits.length > 3 ? `<li style="color: #999;">+${membership.benefits.length - 3} more benefits</li>` : ""}
                      </ul>
                    </div>
                  ` : ""}
                </div>
              `).join('')}
            </div>
            <p style="font-size: 11px; color: #666; margin-top: 10px;">
              🎯 Thank you for being a valued member! Enjoy exclusive benefits and priority service.
            </p>
          </div>
          ` : ""}

          <!-- Rating Section -->
          <div class="rating-section">
            <h3>How was your experience?</h3>
            <div class="stars">★ ★ ★ ★ ★</div>
            <p>Rate us on Google and get 10% off your next visit!</p>
          </div>

          <!-- Payment Method & Notes Section -->
          ${data.paymentMethod || data.notes ? `
          <div class="payment-notes-section" style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; background: #f8f9fa;">
            ${data.paymentMethod ? `
            <div style="margin-bottom: 12px;">
              <h4 style="color: #667eea; margin-bottom: 8px;">
                <span>💳</span>
                Payment Method
              </h4>
              <p style="font-size: 12px; margin: 0;"><strong>${escapeHtml(data.paymentMethod)}</strong></p>
              ${data.transactionId ? `<p style="font-size: 11px; color: #666; margin: 3px 0 0 0;">Transaction ID: ${escapeHtml(data.transactionId)}</p>` : ""}
            </div>
            ` : ""}
            ${data.notes ? `
            <div>
              <h4 style="color: #667eea; margin-bottom: 8px;">
                <span>📝</span>
                Special Notes
              </h4>
              <p style="font-size: 12px; margin: 0; background: white; padding: 10px; border-left: 4px solid #667eea;">${escapeHtml(data.notes)}</p>
            </div>
            ` : ""}
          </div>
          ` : ""}

          <!-- Call to Action -->
          <div class="cta-section" style="text-align: center; margin: 15px 0; padding: 12px; background: #667eea; color: white;">
            <h3 style="color: white; margin-bottom: 8px; font-size: 14px;">Ready for your next transformation?</h3>
            <p style="margin: 0; font-size: 12px;">Book your next appointment and enjoy our premium services!</p>
          </div>
        </div>

        <!-- Modern Footer -->
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

// Add this to handle OPTIONS requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

// Test endpoint for debugging
export async function GET() {
  // Test with minimal HTML without symbols
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body>
      <h1>Test Invoice</h1>
      <p>Amount: 10.00 INR</p>
      <p>Simple HTML test without special characters</p>
    </body>
    </html>
  `
  
  return NextResponse.json({
    success: true,
    htmlContent: testHTML,
    message: "Test HTML without special characters"
  })
}
