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
        SELECT * FROM staff 
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `

      console.log("[v0] Successfully fetched", staff.length, "staff members")

      return NextResponse.json(
        { success: true, staff },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    } catch (error) {
      console.error("[v0] GET /api/staff error:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json(
        {
          success: false,
          staff: [],
          error: error instanceof Error ? error.message : "Failed to fetch staff data",
        },
        { status: 500 },
      )
    }
  })
}

export async function POST(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId }, user) => {
    try {
      // Check user permissions (admin, owner can create staff)
      if (!user.roles.some(role => ["admin", "owner"].includes(role))) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
      }

      const data = await req.json()
      const { name, email, phone, role, salary, commission_rate } = data

      if (!name || !email) {
        return NextResponse.json({ success: false, message: "Name and email are required" }, { status: 400 })
      }

      const [staff] = await sql`
        INSERT INTO staff (tenant_id, name, email, phone, role, salary, commission_rate, created_at)
        VALUES (${tenantId}, ${name}, ${email}, ${phone}, ${role}, ${salary}, ${commission_rate}, NOW())
        RETURNING *
      `

      return NextResponse.json({ success: true, staff })
    } catch (error) {
      console.error("[v0] POST /api/staff:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ success: false, message: "Failed to create staff member" }, { status: 500 })
    }
  })
}

export async function PUT(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId }, user) => {
    try {
      // Check user permissions (admin, owner can update staff)
      if (!user.roles.some(role => ["admin", "owner"].includes(role))) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
      }

      const body = await req.json()
      const id = Number(body.id)
      const data = body.data ?? body

      if (!id || Number.isNaN(id)) {
        return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
      }

      const [staff] = await sql`
        UPDATE staff 
        SET name = COALESCE(${data.name}, name),
            email = COALESCE(${data.email}, email),
            phone = COALESCE(${data.phone}, phone),
            role = COALESCE(${data.role}, role),
            salary = COALESCE(${data.salary}, salary),
            commission_rate = COALESCE(${data.commission_rate}, commission_rate),
            updated_at = NOW()
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING *
      `

      if (!staff) {
        return NextResponse.json({ success: false, message: "Staff member not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, staff })
    } catch (error) {
      console.error("[v0] PUT /api/staff:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ success: false, message: "Failed to update staff member" }, { status: 500 })
    }
  })
}

export async function DELETE(req: Request) {
  return await withTenantAuth(async ({ sql, tenantId }, user) => {
    try {
      // Check user permissions (admin, owner can delete staff)
      if (!user.roles.some(role => ["admin", "owner"].includes(role))) {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 })
      }

      const { searchParams } = new URL(req.url)
      let id = Number(searchParams.get("id"))
      if (!id) {
        try {
          const body = await req.json()
          id = Number(body.id)
        } catch {
          // ignore empty body
        }
      }

      if (!id || Number.isNaN(id)) {
        return NextResponse.json({ success: false, message: "Invalid id" }, { status: 400 })
      }

      const [result] = await sql`
        DELETE FROM staff 
        WHERE id = ${id} AND tenant_id = ${tenantId}
        RETURNING id
      `

      if (!result) {
        return NextResponse.json({ success: false, message: "Staff member not found" }, { status: 404 })
      }

      return NextResponse.json({ success: true, message: "Staff member deleted successfully" })
    } catch (error) {
      console.error("[v0] DELETE /api/staff:", error)

      if (error instanceof Response) {
        return error
      }

      return NextResponse.json({ success: false, message: "Failed to delete staff member" }, { status: 500 })
    }
  })
}
