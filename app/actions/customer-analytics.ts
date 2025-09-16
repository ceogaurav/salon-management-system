"use server"

import { withTenantAuth } from "@/lib/withTenantAuth"

export interface CustomerAnalytics {
  totalSpent: number
  totalVisits: number
  averagePerVisit: number
  lastVisit: string | null
  firstVisit: string | null
  visitFrequency: string
  preferredServices: Array<{
    serviceName: string
    count: number
    percentage: number
    totalSpent: number
  }>
  monthlySpending: Array<{
    month: string
    amount: number
    visits: number
  }>
  yearlyStats: {
    currentYear: number
    totalSpent: number
    totalVisits: number
    averagePerMonth: number
  }
}

export async function getCustomerAnalytics(customerId: string): Promise<CustomerAnalytics> {
  return await withTenantAuth(async ({ sql, tenantId }) => {
    const customerIdNum = Number(customerId)
    
    if (!customerIdNum || isNaN(customerIdNum)) {
      throw new Error("Invalid customer ID")
    }

    // Get invoice data for accurate financial metrics (include all invoices except overdue)
    const invoiceData = await sql`
      SELECT 
        i.amount,
        i.invoice_date,
        i.created_at
      FROM invoices i
      WHERE i.customer_id = ${customerIdNum} 
      AND i.tenant_id = ${tenantId}
      AND i.status IN ('paid', 'sent', 'draft')
      ORDER BY i.invoice_date DESC
    `

    // Get booking data for service preferences and visit tracking
    const bookingData = await sql`
      SELECT 
        b.id,
        b.booking_date,
        b.total_amount,
        b.status,
        STRING_AGG(s.name, ', ') AS service_names,
        SUM(bs.price) as service_total
      FROM bookings b
      LEFT JOIN booking_services bs ON b.id = bs.booking_id AND bs.tenant_id = ${tenantId}
      LEFT JOIN services s ON bs.service_id = s.id AND s.tenant_id = ${tenantId}
      WHERE b.customer_id = ${customerIdNum} 
      AND b.tenant_id = ${tenantId}
      AND b.status = 'completed'
      GROUP BY b.id, b.booking_date, b.total_amount, b.status
      ORDER BY b.booking_date DESC
    `

    // Calculate totals from actual invoices (draft, sent, paid)
    const totalSpent = invoiceData.reduce((sum: number, invoice: any) => sum + Number(invoice.amount || 0), 0)
    const totalVisits = bookingData.length
    const averagePerVisit = totalVisits > 0 ? totalSpent / totalVisits : 0

    // Calculate visit dates
    const lastVisit = bookingData.length > 0 ? bookingData[0].booking_date : null
    const firstVisit = bookingData.length > 0 ? bookingData[bookingData.length - 1].booking_date : null

    // Calculate visit frequency
    let visitFrequency = "No visits"
    if (firstVisit && lastVisit && totalVisits > 1) {
      const daysBetween = Math.floor((new Date(lastVisit).getTime() - new Date(firstVisit).getTime()) / (1000 * 60 * 60 * 24))
      if (daysBetween > 0) {
        const avgDaysBetweenVisits = daysBetween / (totalVisits - 1)
        if (avgDaysBetweenVisits <= 30) {
          visitFrequency = "Monthly"
        } else if (avgDaysBetweenVisits <= 90) {
          visitFrequency = "Quarterly"
        } else if (avgDaysBetweenVisits <= 180) {
          visitFrequency = "Bi-annually"
        } else {
          visitFrequency = "Annually"
        }
      }
    } else if (totalVisits === 1) {
      visitFrequency = "First time"
    }

    // Calculate preferred services with detailed metrics
    const serviceCounts: { [key: string]: { count: number, totalSpent: number } } = {}
    
    bookingData.forEach((booking: any) => {
      if (booking.service_names) {
        const services = booking.service_names.split(',').map((s: string) => s.trim())
        const serviceAmount = Number(booking.service_total || booking.total_amount || 0) / services.length
        
        services.forEach((service: string) => {
          if (!serviceCounts[service]) {
            serviceCounts[service] = { count: 0, totalSpent: 0 }
          }
          serviceCounts[service].count += 1
          serviceCounts[service].totalSpent += serviceAmount
        })
      }
    })

    const preferredServices = Object.entries(serviceCounts)
      .map(([serviceName, data]) => ({
        serviceName,
        count: data.count,
        percentage: totalVisits > 0 ? (data.count / totalVisits) * 100 : 0,
        totalSpent: data.totalSpent
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5) // Top 5 services

    // Calculate monthly spending pattern (last 12 months)
    const monthlySpending = await sql`
      SELECT 
        TO_CHAR(i.invoice_date, 'YYYY-MM') as month,
        SUM(i.amount) as amount,
        COUNT(*) as visits
      FROM invoices i
      WHERE i.customer_id = ${customerIdNum}
      AND i.tenant_id = ${tenantId}
      AND i.status IN ('paid', 'sent', 'draft')
      AND i.invoice_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(i.invoice_date, 'YYYY-MM')
      ORDER BY month DESC
    `

    // Calculate yearly stats
    const currentYear = new Date().getFullYear()
    const yearlyData = await sql`
      SELECT 
        SUM(i.amount) as total_spent,
        COUNT(*) as total_visits
      FROM invoices i
      WHERE i.customer_id = ${customerIdNum}
      AND i.tenant_id = ${tenantId}
      AND i.status IN ('paid', 'sent', 'draft')
      AND EXTRACT(YEAR FROM i.invoice_date) = ${currentYear}
    `

    const yearlySpent = Number(yearlyData[0]?.total_spent || 0)
    const yearlyVisits = Number(yearlyData[0]?.total_visits || 0)

    return {
      totalSpent,
      totalVisits,
      averagePerVisit,
      lastVisit,
      firstVisit,
      visitFrequency,
      preferredServices,
      monthlySpending: monthlySpending.map((row: any) => ({
        month: row.month,
        amount: Number(row.amount || 0),
        visits: Number(row.visits || 0)
      })),
      yearlyStats: {
        currentYear,
        totalSpent: yearlySpent,
        totalVisits: yearlyVisits,
        averagePerMonth: yearlyVisits > 0 ? yearlySpent / 12 : 0
      }
    }
  })
}