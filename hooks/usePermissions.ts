// hooks/usePermissions.ts - React hooks for permission management with Clerk
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@clerk/nextjs'
import { toast } from '@/components/ui/use-toast'

// Types
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
  permission_count?: number
  user_count?: number
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

// =====================================================
// PERMISSION HOOKS
// =====================================================

/**
 * Get current user's permissions
 */
export function useUserPermissions(userId?: string) {
  const { user } = useUser()
  const targetUserId = userId || user?.id

  return useQuery({
    queryKey: ['permissions', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return []
      
      const response = await fetch(`/api/users/${targetUserId}/permissions`)
      if (!response.ok) {
        throw new Error('Failed to fetch permissions')
      }
      
      const data = await response.json()
      return data.permissions || []
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Check if current user has a specific permission
 */
export function useHasPermission(permission: string) {
  const { data: permissions = [], isLoading } = useUserPermissions()
  
  return {
    hasPermission: permissions.includes(permission),
    isLoading,
    permissions
  }
}

/**
 * Check if current user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: string[]) {
  const { data: userPermissions = [], isLoading } = useUserPermissions()
  
  return {
    hasAnyPermission: permissions.some(permission => userPermissions.includes(permission)),
    isLoading,
    userPermissions
  }
}

/**
 * Check if current user has all of the specified permissions
 */
export function useHasAllPermissions(permissions: string[]) {
  const { data: userPermissions = [], isLoading } = useUserPermissions()
  
  return {
    hasAllPermissions: permissions.every(permission => userPermissions.includes(permission)),
    isLoading,
    userPermissions
  }
}

/**
 * Get all available permissions
 */
export function useAllPermissions() {
  return useQuery({
    queryKey: ['all-permissions'],
    queryFn: async () => {
      const response = await fetch('/api/permissions')
      if (!response.ok) {
        throw new Error('Failed to fetch permissions')
      }
      
      const data = await response.json()
      return {
        permissions: data.permissions || [],
        permissionsByCategory: data.permissionsByCategory || {}
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  })
}

// =====================================================
// USER MANAGEMENT HOOKS
// =====================================================

/**
 * Get all users
 */
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      const data = await response.json()
      return data.users || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get user by ID
 */
export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch user')
      }
      
      const data = await response.json()
      return data.user
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Create new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create user')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'User Created',
        description: `${data.user.name} has been added to the system.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update user
 */
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<User> }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update user')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['user', variables.userId] })
      toast({
        title: 'User Updated',
        description: `${data.user.name} has been updated successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete user
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete user')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'User Deleted',
        description: 'User has been removed from the system.',
        variant: 'destructive',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Assign permission to user
 */
export function useAssignUserPermission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      userId, 
      permissionId, 
      granted 
    }: { 
      userId: string
      permissionId: string
      granted: boolean 
    }) => {
      const response = await fetch(`/api/users/${userId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          permission_id: permissionId,
          granted,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign permission')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['permissions', variables.userId] })
      toast({
        title: `Permission ${variables.granted ? 'Granted' : 'Revoked'}`,
        description: data.message,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// =====================================================
// ROLE MANAGEMENT HOOKS
// =====================================================

/**
 * Get all roles
 */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await fetch('/api/roles')
      if (!response.ok) {
        throw new Error('Failed to fetch roles')
      }
      
      const data = await response.json()
      return data.roles || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get role by ID
 */
export function useRole(roleId: string) {
  return useQuery({
    queryKey: ['role', roleId],
    queryFn: async () => {
      const response = await fetch(`/api/roles/${roleId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch role')
      }
      
      const data = await response.json()
      return data.role
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get role permissions
 */
export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: ['role-permissions', roleId],
    queryFn: async () => {
      const response = await fetch(`/api/roles/${roleId}/permissions`)
      if (!response.ok) {
        throw new Error('Failed to fetch role permissions')
      }
      
      const data = await response.json()
      return data.permissions || []
    },
    enabled: !!roleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Create new role
 */
export function useCreateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roleData: Omit<Role, 'id' | 'created_at' | 'updated_at' | 'is_system'>) => {
      const response = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roleData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create role')
      }

      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast({
        title: 'Role Created',
        description: `${data.role.name} role has been created successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roleId, updates }: { roleId: string; updates: Partial<Role> }) => {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['role', variables.roleId] })
      toast({
        title: 'Role Updated',
        description: `${data.role.name} role has been updated successfully.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete role
 */
export function useDeleteRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete role')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast({
        title: 'Role Deleted',
        description: 'Role has been deleted successfully.',
        variant: 'destructive',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update role permissions
 */
export function useUpdateRolePermissions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: string; permissions: string[] }) => {
      const response = await fetch(`/api/roles/${roleId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role permissions')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['role', variables.roleId] })
      queryClient.invalidateQueries({ queryKey: ['role-permissions', variables.roleId] })
      // Also invalidate user permissions since role permissions changed
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      
      toast({
        title: 'Permissions Updated',
        description: data.message,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}