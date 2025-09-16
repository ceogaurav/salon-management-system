// app/api/roles/route.ts - Role management API endpoints (Clerk-based)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// GET /api/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return sample roles for development
    const roles = [
      { id: '1', name: 'admin', description: 'Administrator', is_system: true },
      { id: '2', name: 'manager', description: 'Salon Manager', is_system: false },
      { id: '3', name: 'staff', description: 'Salon Staff', is_system: false },
      { id: '4', name: 'receptionist', description: 'Receptionist', is_system: false },
    ]
    
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
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // For development, just return success
    return NextResponse.json({ 
      success: true, 
      message: 'Role creation not implemented in demo mode' 
    })
  } catch (error) {
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Failed to create role' },
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