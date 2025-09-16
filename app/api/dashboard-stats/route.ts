// app/api/dashboard-stats/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function GET() {
  try {
    const { orgId, userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 401 })
    }

    // Return mock dashboard stats for demo mode
    const mockStats = {
      totalRevenue: 15750.00,
      totalBookings: 127,
      totalCustomers: 89,
      totalStaff: 5,
      revenueGrowth: 12.5,
      bookingsGrowth: 8.3,
      customersGrowth: 15.2,
      staffGrowth: 0,
      dailyRevenue: [
        { date: '2025-01-10', revenue: 890 },
        { date: '2025-01-11', revenue: 1120 },
        { date: '2025-01-12', revenue: 980 },
        { date: '2025-01-13', revenue: 1350 },
        { date: '2025-01-14', revenue: 1180 },
        { date: '2025-01-15', revenue: 1420 }
      ],
      topServices: [
        { name: 'Haircut', revenue: 4500, bookings: 45 },
        { name: 'Hair Styling', revenue: 3200, bookings: 32 },
        { name: 'Manicure', revenue: 2800, bookings: 28 }
      ],
      tenantId: orgId
    }
    
    return NextResponse.json({
      ...mockStats,
      note: "Demo data - dashboard stats integration pending"
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}