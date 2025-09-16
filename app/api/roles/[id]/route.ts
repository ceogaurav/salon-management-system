// app/api/roles/[id]/route.ts - Individual role management API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getRoleById, updateRole, deleteRole, logAuditEvent } from '@/lib/rbac'
import { headers } from 'next/headers'
import { getClientIP } from '@/lib/utils'

// GET /api/roles/[id] - Get role by ID
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
    const role = await getRoleById(roleId)

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    )
  }
}

// PUT /api/roles/[id] - Update role
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
    
    // Get original role data for audit log
    const originalRole = await getRoleById(roleId)
    if (!originalRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent modification of system roles
    if (originalRole.is_system) {
      return NextResponse.json(
        { error: 'Cannot modify system roles' },
        { status: 400 }
      )
    }

    // Update role
    const updatedRole = await updateRole(roleId, body)

    if (!updatedRole) {
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      'role_updated',
      'role',
      roleId,
      {
        old_values: {
          name: originalRole.name,
          description: originalRole.description
        },
        new_values: {
          name: updatedRole.name,
          description: updatedRole.description
        }
      },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ role: updatedRole })
  } catch (error) {
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(
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

    // Get role data for audit log before deletion
    const role = await getRoleById(roleId)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    // Prevent deletion of system roles
    if (role.is_system) {
      return NextResponse.json(
        { error: 'Cannot delete system roles' },
        { status: 400 }
      )
    }

    // Delete role
    const success = await deleteRole(roleId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete role' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      'role_deleted',
      'role',
      roleId,
      { name: role.name, description: role.description },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ message: 'Role deleted successfully' })
  } catch (error) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  }
}