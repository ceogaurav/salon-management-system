import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] GET /api/staff - Starting request")

    const { searchParams } = new URL(req.url)

    if (searchParams.get("stats") === "1") {
      console.log("[v0] Fetching tenant-scoped staff stats")

      const mockStats = {
        total_staff: 5,
        active_staff: 4,
        new_this_month: 1
      }

      console.log("[v0] Successfully fetched stats:", mockStats)
      return NextResponse.json(mockStats, {
        status: 200,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })
    }

    console.log("[v0] Fetching tenant-scoped staff list")

    // Return mock staff for demo
    const mockStaff = [
      {
        id: '1',
        name: 'Alice Johnson',
        email: 'alice@demo.com',
        phone: '+1234567890',
        role: 'Senior Stylist',
        department: 'Hair',
        status: 'active',
        hire_date: '2023-01-15',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Bob Smith',
        email: 'bob@demo.com',
        phone: '+0987654321',
        role: 'Nail Technician',
        department: 'Nails',
        status: 'active',
        hire_date: '2023-03-20',
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Carol Davis',
        email: 'carol@demo.com',
        phone: '+1122334455',
        role: 'Receptionist',
        department: 'Front Desk',
        status: 'active',
        hire_date: '2023-06-10',
        created_at: new Date().toISOString()
      }
    ]

    console.log("[v0] Successfully fetched staff list")
    return NextResponse.json({
      staff: mockStaff,
      tenantId: orgId || 'demo-tenant',
      note: "Demo data - staff management integration pending"
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[v0] Staff API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
