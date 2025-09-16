// app/api/users/route.ts - User management API endpoints
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

export const dynamic = "force-dynamic" // Prevents build-time execution

// GET /api/users - Get all users
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return mock users for demo
    const mockUsers = [
      {
        id: '1',
        name: 'Demo Admin',
        email: 'admin@demo.com',
        phone: '+1234567890',
        role_id: '1',
        role_name: 'Administrator',
        department: 'Management',
        employee_id: 'EMP001',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Demo Staff',
        email: 'staff@demo.com',
        phone: '+0987654321',
        role_id: '2',
        role_name: 'Staff',
        department: 'Operations',
        employee_id: 'EMP002',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]
    
    return NextResponse.json({ 
      users: mockUsers,
      note: "Demo data - user management integration pending"
    })
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
    const { userId } = await auth()
    
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

    // Return mock created user
    const mockUser = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      role_id,
      department,
      employee_id,
      is_active,
      created_at: new Date().toISOString()
    }

    return NextResponse.json({ 
      user: mockUser,
      note: "Demo mode - user not actually created"
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}      created_at: new Date().toISOString()
    }

    return NextResponse.json({ 
      user: mockUser,
      note: "Demo mode - user not actually created"
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}