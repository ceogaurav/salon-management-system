import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { consentType, consentGiven } = body

    // Get client IP and user agent
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1"
    const userAgent = request.headers.get("user-agent") || ""

    // Mock consent recording for demo mode
    const consentRecord = {
      id: Date.now().toString(),
      userId,
      consentType: consentType === "all" ? "essential" : consentType,
      consentGiven,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    }

    console.log("[CONSENT] Recording consent (demo mode):", consentRecord)

    return NextResponse.json({
      success: true,
      message: "Consent recorded successfully",
      data: consentRecord,
      note: "Demo mode - consent not persisted to database"
    })
  } catch (error) {
    console.error("Consent API error:", error)
    return NextResponse.json({ success: false, message: "Failed to record consent" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get("userId")
    const consentType = searchParams.get("consentType")

    if (!targetUserId || !consentType) {
      return NextResponse.json({ success: false, message: "Missing required parameters" }, { status: 400 })
    }

    // Mock consent data for demo mode
    const mockConsent = {
      id: "1",
      userId: targetUserId,
      consentType,
      consentGiven: true,
      ipAddress: "192.168.1.1",
      userAgent: "Demo User Agent",
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      data: mockConsent,
      note: "Demo mode - returning mock consent data"
    })
  } catch (error) {
    console.error("Get consent API error:", error)
    return NextResponse.json({ success: false, message: "Failed to get consent" }, { status: 500 })
  }
}
