// app/api/permissions/user/[userId]/route.ts - API route for fetching user permissions
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserPermissions } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check authentication
    const { userId: currentUserId } = auth()
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const targetUserId = params.userId

    // Allow users to check their own permissions
    // or require admin permission to check others' permissions
    if (currentUserId !== targetUserId) {
      const currentUserPermissions = await getUserPermissions(currentUserId)
      if (!currentUserPermissions.includes('users.view')) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // Get user permissions
    const permissions = await getUserPermissions(targetUserId)

    return NextResponse.json({
      userId: targetUserId,
      permissions
    })

  } catch (error) {
    console.error('Error in permissions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}