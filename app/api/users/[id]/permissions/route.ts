// app/api/users/[id]/permissions/route.ts - User permissions API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getUserPermissions, assignUserPermission, logAuditEvent } from '@/lib/rbac'
import { headers } from 'next/headers'
import { getClientIP } from '@/lib/utils'

// GET /api/users/[id]/permissions - Get user's effective permissions
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    const permissions = await getUserPermissions(userId)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user permissions' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/permissions - Assign permission override to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    const body = await request.json()
    const { permission_id, granted } = body

    // Validate required fields
    if (!permission_id || typeof granted !== 'boolean') {
      return NextResponse.json(
        { error: 'permission_id and granted (boolean) are required' },
        { status: 400 }
      )
    }

    // Assign permission override
    const success = await assignUserPermission(userId, permission_id, granted, session.user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to assign user permission' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      granted ? 'permission_granted' : 'permission_revoked',
      'user_permission',
      userId,
      { permission_id, granted },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ 
      message: `Permission ${granted ? 'granted' : 'revoked'} successfully`,
      permission_id,
      granted
    })
  } catch (error) {
    console.error('Error assigning user permission:', error)
    return NextResponse.json(
      { error: 'Failed to assign user permission' },
      { status: 500 }
    )
  }
}