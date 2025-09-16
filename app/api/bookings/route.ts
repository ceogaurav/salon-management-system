import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const {
      customer_id,
      service_id,
      staff_id,
      booking_date,
      booking_time,
      status = "confirmed",
      notes = "",
      amount = 0,
    } = await req.json()

    if (!customer_id || !service_id || !booking_date || !booking_time) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Mock booking creation for demo mode
    const mockBooking = {
      id: Date.now(),
      tenant_id: orgId || 'demo-tenant',
      customer_id,
      service_id,
      staff_id,
      booking_date,
      booking_time,
      status,
      notes,
      amount,
      created_at: new Date().toISOString(),
      booking_number: `BK${Date.now().toString().slice(-6)}`
    }

    console.log("[BOOKINGS] Creating booking (demo mode):", mockBooking)

    return NextResponse.json({
      success: true,
      booking: mockBooking,
      note: "Demo mode - booking not persisted to database"
    }, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Booking creation error:", error)
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Mock bookings data for demo mode
    const mockBookings = [
      {
        id: 1,
        tenant_id: orgId || 'demo-tenant',
        customer_id: 1,
        service_id: 1,
        staff_id: 1,
        booking_date: '2025-01-16',
        booking_time: '10:00',
        status: 'confirmed',
        notes: 'Regular customer',
        amount: 75.00,
        created_at: new Date().toISOString(),
        booking_number: 'BK001234',
        customer_name: 'Sarah Johnson',
        service_name: 'Haircut',
        staff_name: 'Alice Johnson'
      },
      {
        id: 2,
        tenant_id: orgId || 'demo-tenant',
        customer_id: 2,
        service_id: 2,
        staff_id: 1,
        booking_date: '2025-01-16',
        booking_time: '14:30',
        status: 'pending',
        notes: 'First visit',
        amount: 120.00,
        created_at: new Date().toISOString(),
        booking_number: 'BK001235',
        customer_name: 'Mike Davis',
        service_name: 'Hair Styling',
        staff_name: 'Alice Johnson'
      },
      {
        id: 3,
        tenant_id: orgId || 'demo-tenant',
        customer_id: 3,
        service_id: 3,
        staff_id: 2,
        booking_date: '2025-01-17',
        booking_time: '11:15',
        status: 'confirmed',
        notes: 'Anniversary special',
        amount: 85.00,
        created_at: new Date().toISOString(),
        booking_number: 'BK001236',
        customer_name: 'Emily Brown',
        service_name: 'Manicure',
        staff_name: 'Bob Smith'
      }
    ]

    return NextResponse.json({
      bookings: mockBookings,
      tenantId: orgId || 'demo-tenant',
      note: "Demo data - booking management integration pending"
    })
  } catch (error: any) {
    console.error("[v0] Bookings fetch error:", error)
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
  }
}
