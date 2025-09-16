// app/api/roles/[id]/permissions/route.ts - Role permissions API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getRolePermissions, assignPermissionsToRole, getRoleById, logAuditEvent } from '@/lib/rbac'
import { headers } from 'next/headers'
import { getClientIP } from '@/lib/utils'

// GET /api/roles/[id]/permissions - Get role permissions
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

    const roleId = params.id
    const permissions = await getRolePermissions(roleId)

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    )
  }
}

// PUT /api/roles/[id]/permissions - Update role permissions
export async function PUT(
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

    const roleId = params.id
    const body = await request.json()
    const { permissions } = body

    // Validate required fields
    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { error: 'permissions must be an array of permission IDs' },
        { status: 400 }
      )
    }

    // Check if role exists and is not a system role
    const role = await getRoleById(roleId)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify permissions for system roles' },
        { status: 400 }
      )
    }

    // Get current permissions for audit log
    const currentPermissions = await getRolePermissions(roleId)

    // Assign new permissions to role
    const success = await assignPermissionsToRole(roleId, permissions)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update role permissions' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      'role_permissions_updated',
      'role',
      roleId,
      {
        role_name: role.name,
        old_permissions: currentPermissions,
        new_permissions: permissions,
        added_permissions: permissions.filter(p => !currentPermissions.includes(p)),
        removed_permissions: currentPermissions.filter(p => !permissions.includes(p))
      },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ 
      message: 'Role permissions updated successfully',
      permissions 
    })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    )
  }
}