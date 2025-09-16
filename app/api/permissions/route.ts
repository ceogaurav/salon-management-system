// app/api/permissions/route.ts - Permissions API endpoints (Clerk-based)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// GET /api/permissions - Get all permissions
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return sample permissions for development
    const permissions = [
      { id: '1', name: 'dashboard.view', category: 'dashboard', description: 'View Dashboard' },
      { id: '2', name: 'customers.view', category: 'customers', description: 'View Customers' },
      { id: '3', name: 'customers.create', category: 'customers', description: 'Create Customers' },
      { id: '4', name: 'bookings.view', category: 'bookings', description: 'View Bookings' },
      { id: '5', name: 'sales.view', category: 'sales', description: 'View Sales' },
      { id: '6', name: 'settings.view', category: 'settings', description: 'View Settings' },
    ]
    
    // Group permissions by category
    const permissionsByCategory = permissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, typeof permissions>)

    return NextResponse.json({ 
      permissions,
      permissionsByCategory
    })
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}