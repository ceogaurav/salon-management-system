import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get("stats") === "1"

    // Mock customers data for demo mode
    const mockCustomers = [
      {
        id: 1,
        full_name: "Sarah Johnson",
        phone_number: "+1234567890",
        email: "sarah@email.com",
        address: "123 Main St, City",
        gender: "Female",
        date_of_birth: "1990-05-15",
        total_bookings: 12,
        total_spent: 850.00,
        created_at: "2024-01-15T10:00:00Z"
      },
      {
        id: 2,
        full_name: "Mike Davis",
        phone_number: "+0987654321",
        email: "mike@email.com",
        address: "456 Oak Ave, Town",
        gender: "Male",
        date_of_birth: "1985-08-22",
        total_bookings: 8,
        total_spent: 420.00,
        created_at: "2024-02-10T14:30:00Z"
      },
      {
        id: 3,
        full_name: "Emily Brown",
        phone_number: "+1122334455",
        email: "emily@email.com",
        address: "789 Pine Rd, Village",
        gender: "Female",
        date_of_birth: "1992-12-03",
        total_bookings: 15,
        total_spent: 1250.00,
        created_at: "2024-01-05T09:15:00Z"
      }
    ]

    const response: any = {
      success: true,
      customers: mockCustomers,
      count: mockCustomers.length,
      tenantId: orgId || 'demo-tenant',
      note: "Demo data - customer management integration pending"
    }

    if (includeStats) {
      const mockStats = {
        total: mockCustomers.length,
        newToday: 1,
        newThisMonth: 8,
        averageSpent: 840.00,
        totalRevenue: 2520.00,
        topCustomers: mockCustomers.slice(0, 3)
      }
      response.stats = mockStats
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Error in customers API:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Failed to fetch customers",
        message: error.message,
        customers: [], 
        count: 0 
      },
      { status: 500 },
    )
  }
}
