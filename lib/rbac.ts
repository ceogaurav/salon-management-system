// lib/rbac.ts - Core RBAC utility functions and permission checking
import { Pool } from 'pg'

// Initialize Neon PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role_id: string
  is_active: boolean
  department?: string
  employee_id?: string
  avatar_url?: string
  last_login?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface Role {
  id: string
  name: string
  description: string
  color?: string
  icon?: string
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface Permission {
  id: string
  name: string
  description: string
  category: string
  level: 'basic' | 'advanced' | 'critical'
  created_at: string
  updated_at: string
}

export interface UserPermission {
  user_id: string
  permission_id: string
  granted: boolean
  created_at: string
  updated_at: string
  created_by?: string
}

export interface RolePermission {
  role_id: string
  permission_id: string
  created_at: string
}

// =====================================================
// CORE PERMISSION FUNCTIONS
// =====================================================

/**
 * Get all effective permissions for a user (role permissions + user overrides)
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT permission_id FROM user_effective_permissions($1)',
        [userId]
      )
      return result.rows.map(row => row.permission_id)
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in getUserPermissions:', error)
    return []
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT user_has_permission($1, $2) as has_permission',
        [userId, permission]
      )
      return result.rows[0]?.has_permission || false
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in hasPermission:', error)
    return false
  }
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

// =====================================================
// USER MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get user by ID with role information
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT u.*, r.name as role_name, r.description as role_description, r.color as role_color
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1`,
        [userId]
      )
      
      if (result.rows.length === 0) return null
      
      const user = result.rows[0]
      return {
        ...user,
        role: user.role_name ? {
          id: user.role_id,
          name: user.role_name,
          description: user.role_description,
          color: user.role_color
        } : null
      }
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in getUserById:', error)
    return null
  }
}

/**
 * Get all users with their roles
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        `SELECT u.*, r.name as role_name, r.description as role_description, r.color as role_color
         FROM users u 
         LEFT JOIN roles r ON u.role_id = r.id 
         ORDER BY u.created_at DESC`
      )
      
      return result.rows.map(user => ({
        ...user,
        role: user.role_name ? {
          id: user.role_id,
          name: user.role_name,
          description: user.role_description,
          color: user.role_color
        } : null
      }))
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in getAllUsers:', error)
    return []
  }
}

/**
 * Create a new user
 */
export async function createUser(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>, createdBy: string): Promise<User | null> {
  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        `INSERT INTO users (name, email, phone, role_id, is_active, department, employee_id, avatar_url, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [userData.name, userData.email, userData.phone, userData.role_id, userData.is_active, 
         userData.department, userData.employee_id, userData.avatar_url, createdBy]
      )
      
      return result.rows[0]
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in createUser:', error)
    return null
  }
}

/**
 * Update user information
 */
export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const client = await pool.connect()
    try {
      // Build dynamic UPDATE query based on provided fields
      const fields = Object.keys(updates).filter(key => key !== 'id')
      const values = fields.map(field => updates[field as keyof User])
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ')
      
      const result = await client.query(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
        [userId, ...values]
      )
      
      return result.rows[0] || null
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in updateUser:', error)
    return null
  }
}

/**
 * Delete user (soft delete by setting inactive)
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const client = await pool.connect()
    try {
      await client.query(
        'UPDATE users SET is_active = false WHERE id = $1',
        [userId]
      )
      return true
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error in deleteUser:', error)
    return false
  }
}

// =====================================================
// ROLE MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get all roles with permission counts
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(permission_id),
        users(id)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching roles:', error)
      return []
    }

    return data?.map(role => ({
      ...role,
      permission_count: role.role_permissions?.length || 0,
      user_count: role.users?.length || 0
    })) || []
  } catch (error) {
    console.error('Error in getAllRoles:', error)
    return []
  }
}

/**
 * Get role by ID with permissions
 */
export async function getRoleById(roleId: string): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select(`
        *,
        role_permissions(
          permission_id,
          permissions(*)
        )
      `)
      .eq('id', roleId)
      .single()

    if (error) {
      console.error('Error fetching role:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getRoleById:', error)
    return null
  }
}

/**
 * Create a new role
 */
export async function createRole(roleData: Omit<Role, 'id' | 'created_at' | 'updated_at'>, createdBy: string): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        ...roleData,
        created_by: createdBy
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating role:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in createRole:', error)
    return null
  }
}

/**
 * Update role information
 */
export async function updateRole(roleId: string, updates: Partial<Role>): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId)
      .select()
      .single()

    if (error) {
      console.error('Error updating role:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateRole:', error)
    return null
  }
}

/**
 * Delete role (only non-system roles)
 */
export async function deleteRole(roleId: string): Promise<boolean> {
  try {
    // Check if role is system role
    const { data: role } = await supabase
      .from('roles')
      .select('is_system')
      .eq('id', roleId)
      .single()

    if (role?.is_system) {
      console.error('Cannot delete system role')
      return false
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (error) {
      console.error('Error deleting role:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in deleteRole:', error)
    return false
  }
}

// =====================================================
// PERMISSION MANAGEMENT FUNCTIONS
// =====================================================

/**
 * Get all permissions organized by category
 */
export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching permissions:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAllPermissions:', error)
    return []
  }
}

/**
 * Get permissions for a specific role
 */
export async function getRolePermissions(roleId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .eq('role_id', roleId)

    if (error) {
      console.error('Error fetching role permissions:', error)
      return []
    }

    return data?.map(rp => rp.permission_id) || []
  } catch (error) {
    console.error('Error in getRolePermissions:', error)
    return []
  }
}

/**
 * Assign permissions to a role
 */
export async function assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<boolean> {
  try {
    // First, remove existing permissions
    await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)

    // Then add new permissions
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        role_id: roleId,
        permission_id: permissionId
      }))

      const { error } = await supabase
        .from('role_permissions')
        .insert(rolePermissions)

      if (error) {
        console.error('Error assigning permissions to role:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error in assignPermissionsToRole:', error)
    return false
  }
}

/**
 * Assign user-specific permission override
 */
export async function assignUserPermission(userId: string, permissionId: string, granted: boolean, createdBy: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        permission_id: permissionId,
        granted,
        created_by: createdBy,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error assigning user permission:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in assignUserPermission:', error)
    return false
  }
}

// =====================================================
// AUDIT FUNCTIONS
// =====================================================

/**
 * Log an audit event
 */
export async function logAuditEvent(
  userId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('log_audit_event', {
      p_user_id: userId,
      p_action: action,
      p_target_type: targetType,
      p_target_id: targetId,
      p_details: details ? JSON.stringify(details) : null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent
    })

    if (error) {
      console.error('Error logging audit event:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in logAuditEvent:', error)
    return false
  }
}

/**
 * Get audit logs with filtering
 */
export async function getAuditLogs(
  userId?: string,
  action?: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  try {
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (action) {
      query = query.eq('action', action)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching audit logs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getAuditLogs:', error)
    return []
  }
}