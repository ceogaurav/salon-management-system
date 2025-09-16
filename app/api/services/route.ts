import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { userId, orgId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return mock services for demo
    const mockServices = [
      {
        id: '1',
        name: 'Haircut',
        description: 'Professional haircut service',
        duration: 30,
        price: 50.00,
        category: 'Hair',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Hair Styling',
        description: 'Hair styling and finishing',
        duration: 45,
        price: 75.00,
        category: 'Hair',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Manicure',
        description: 'Complete nail care service',
        duration: 60,
        price: 40.00,
        category: 'Nails',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]

    return NextResponse.json({
      services: mockServices,
      tenantId: orgId || 'demo-tenant',
      note: "Demo data - services integration pending"
    })
  } catch (error) {
    console.error("GET /api/services error:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
