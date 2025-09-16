// app/api/roles/route.ts - Role management API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getAllRoles, createRole, logAuditEvent } from '@/lib/rbac'
import { headers } from 'next/headers'
import { getClientIP } from '@/lib/utils'

// GET /api/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all roles
    const roles = await getAllRoles()
    
    return NextResponse.json({ roles })
  } catch (error) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

// POST /api/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      description, 
      color = 'bg-gray-100 text-gray-800', 
      icon,
      is_active = true 
    } = body

    // Validate required fields
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      )
    }

    // Create role
    const newRole = await createRole({
      name,
      description,
      color,
      icon,
      is_system: false, // Custom roles are never system roles
      is_active
    }, session.user.id)

    if (!newRole) {
      return NextResponse.json(
        { error: 'Failed to create role' },
        { status: 500 }
      )
    }

    // Log audit event
    const headersList = headers()
    await logAuditEvent(
      session.user.id,
      'role_created',
      'role',
      newRole.id,
      { name, description },
      getClientIP(request),
      headersList.get('user-agent') || undefined
    )

    return NextResponse.json({ role: newRole }, { status: 201 })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}