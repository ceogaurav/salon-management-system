// app/api/dashboard-stats/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getAuthenticatedSql } from "@/lib/db"
import { getDashboardStats } from "@/app/actions/dashboard"

export async function GET() {
  try {
    const { orgId, orgSlug, userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    if (!orgId) {
      return NextResponse.json({ error: "Organization required" }, { status: 401 })
    }

    const tenantKey = orgSlug ?? orgId
    const { sql, tenantId } = await getAuthenticatedSql(tenantKey)
    
    const stats = await getDashboardStats()
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}