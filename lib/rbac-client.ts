// lib/rbac-client.ts - Client-side RBAC utilities that work in all environments
import { auth } from '@clerk/nextjs/server'

// Check if we're in Edge Runtime (middleware)
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined' || 
                     typeof process === 'undefined' || 
                     !process.versions?.node

/**
 * Get user permissions - client-safe version
 * This function will make an API call instead of direct database access
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  if (isEdgeRuntime) {
    // In Edge Runtime (middleware), we can't access the database
    // Return empty array and let the API routes handle permission checking
    console.warn('getUserPermissions called in Edge Runtime - returning empty permissions')
    return []
  }

  try {
    // In Node.js runtime, we can make API calls
    const response = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/permissions/user/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch user permissions:', response.statusText)
      return []
    }

    const data = await response.json()
    return data.permissions || []
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return []
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId)
  return permissions.every(permission => userPermissions.includes(permission))
}

/**
 * Get current user's permissions using Clerk auth
 */
export async function getCurrentUserPermissions(): Promise<string[]> {
  if (isEdgeRuntime) {
    return []
  }

  try {
    const { userId } = auth()
    if (!userId) return []
    
    return await getUserPermissions(userId)
  } catch (error) {
    console.error('Error getting current user permissions:', error)
    return []
  }
}

/**
 * Check if current user has permission
 */
export async function currentUserHasPermission(permission: string): Promise<boolean> {
  const permissions = await getCurrentUserPermissions()
  return permissions.includes(permission)
}