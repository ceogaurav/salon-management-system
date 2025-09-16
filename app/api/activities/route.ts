import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function GET(request: NextRequest) {
  try {
    // 🔑 Get Clerk auth session
    const { userId, orgId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For now, return mock data to prevent database access during build
    // This will be replaced with actual database queries once deployed
    const mockActivities = [
      {
        type: 'booking',
        id: '1',
        reference_number: 'BK001',
        customer_name: 'Demo Customer',
        customer_phone: '+1234567890',
        staff_name: 'Demo Staff',
        staff_role: 'Stylist',
        service_names: ['Haircut', 'Styling'],
        amount: 75.00,
        status: 'completed',
        completion_time: '14:30',
        booking_date: new Date().toISOString().split('T')[0],
        booking_time: '14:00',
        notes: 'Demo booking',
        created_at: new Date().toISOString()
      }
    ]

    const mockStats = {
      total_today: 5,
      completed_today: 3,
      pending_confirmations: 2,
      total_revenue_today: 375.00
    }

    return NextResponse.json({
      activities: mockActivities,
      stats: mockStats,
      note: "Demo data - database integration pending"
    })
    
  } catch (error) {
    console.error("Error fetching activities:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
