// app/api/permissions/user/[userId]/route.ts - API route for fetching user permissions
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = "force-dynamic" // Prevents build-time execution

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check authentication
    const { userId: currentUserId } = await auth()
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const targetUserId = params.userId

    // Return mock permissions for demo
    const mockPermissions = [
      'dashboard.view',
      'customers.view',
      'customers.create',
      'bookings.view',
      'bookings.create',
      'staff.view',
      'settings.view'
    ]

    return NextResponse.json({
      userId: targetUserId,
      permissions: mockPermissions,
      note: "Demo permissions - RBAC integration pending"
    })

  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}