// app/api/users/[id]/route.ts - Individual user management API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getUserById, updateUser, deleteUser, logAuditEvent } from '@/lib/rbac'
import { headers } from 'next/headers'
import { getClientIP } from '@/lib/utils'

// GET /api/users/[id] - Get user by ID
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
    const user = await getUserById(userId)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id] - Update user
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

    const userId = params.id
    const body = await request.json()
    
    // Get original user data for audit log
    const originalUser = await getUserById(userId)
    if (!originalUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user
    const updatedUser = await updateUser(userId, body)

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      'user_updated',
      'user',
      userId,
      {
        old_values: {
          name: originalUser.name,
          email: originalUser.email,
          role_id: originalUser.role_id,
          is_active: originalUser.is_active
        },
        new_values: {
          name: updatedUser.name,
          email: updatedUser.email,
          role_id: updatedUser.role_id,
          is_active: updatedUser.is_active
        }
      },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user (soft delete)
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

    const userId = params.id

    // Get user data for audit log before deletion
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user (soft delete)
    const success = await deleteUser(userId)

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      'user_deleted',
      'user',
      userId,
      { name: user.name, email: user.email },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}