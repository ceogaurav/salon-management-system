// app/api/users/route.ts - User management API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { getAllUsers, createUser, logAuditEvent } from '@/lib/rbac'
import { getClientIP } from '@/lib/utils'

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all users
    const users = await getAllUsers()
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, role_id, department, employee_id, is_active = true } = body

    // Validate required fields
    if (!name || !email || !role_id) {
      return NextResponse.json(
        { error: 'Name, email, and role are required' },
        { status: 400 }
      )
    }

    // Create user
    const newUser = await createUser({
      name,
      email,
      phone,
      role_id,
      department,
      employee_id,
      is_active
    }, userId)

    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Log audit event
    await logAuditEvent(
      userId,
      'user_created',
      'user',
      newUser.id,
      { name, email, role_id },
      getClientIP(request),
      request.headers.get('user-agent') || undefined
    )

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}