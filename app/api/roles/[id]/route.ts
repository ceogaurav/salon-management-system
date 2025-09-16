// app/api/roles/[id]/route.ts - Stub API for Clerk authentication
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest, context?: any) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      message: 'API endpoint available but not fully implemented in demo mode',
      user: userId,
      data: []
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context?: any) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      message: 'Role update not implemented in demo mode',
      success: true
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context?: any) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ 
      message: 'Role deletion not implemented in demo mode',
      success: true
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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