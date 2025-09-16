import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function GET() {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      message: "Salon Management System API",
      version: "1.0.0",
      tenantId: orgId || "demo-tenant",
      endpoints: {
        inventory: "/api/inventory",
        campaigns: "/api/campaigns",
        staff: "/api/staff",
        customers: "/api/customers",
        bookings: "/api/bookings",
      },
      note: "Demo mode - database integration pending"
    })
  } catch (error) {
    console.error("API route error:", error)
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Handle generic POST requests with basic validation
    return NextResponse.json({
      success: true,
      message: "Request received successfully",
      data: body,
      tenantId: orgId || "demo-tenant",
      timestamp: new Date().toISOString(),
      note: "Demo mode - data not persisted"
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON payload",
      },
      { status: 400 },
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}
