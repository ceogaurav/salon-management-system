// components/rbac/PermissionGate.tsx - Component to conditionally render based on permissions
'use client'

import React from 'react'
import { useHasPermission, useHasAnyPermission, useHasAllPermissions } from '@/hooks/usePermissions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock } from 'lucide-react'

interface BasePermissionGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
  loading?: React.ReactNode
}

interface SinglePermissionProps extends BasePermissionGateProps {
  permission: string
  permissions?: never
  requireAll?: never
}

interface MultiplePermissionsProps extends BasePermissionGateProps {
  permission?: never
  permissions: string[]
  requireAll?: boolean // true = all permissions required, false = any permission required
}

type PermissionGateProps = SinglePermissionProps | MultiplePermissionsProps

/**
 * PermissionGate component to conditionally render content based on user permissions
 * 
 * @example
 * // Single permission
 * <PermissionGate permission="users.create">
 *   <Button>Create User</Button>
 * </PermissionGate>
 * 
 * @example
 * // Any of multiple permissions
 * <PermissionGate permissions={["users.view", "users.edit"]}>
 *   <UserList />
 * </PermissionGate>
 * 
 * @example
 * // All permissions required
 * <PermissionGate permissions={["users.create", "users.roles"]} requireAll>
 *   <CreateUserWithRole />
 * </PermissionGate>
 * 
 * @example
 * // With custom fallback
 * <PermissionGate 
 *   permission="settings.edit"
 *   fallback={<div>You don't have permission to edit settings</div>}
 * >
 *   <SettingsForm />
 * </PermissionGate>
 */
export function PermissionGate(props: PermissionGateProps) {
  const {
    children,
    fallback = null,
    showFallback = false,
    loading = null
  } = props

  // Handle single permission
  if ('permission' in props && props.permission) {
    const { hasPermission, isLoading } = useHasPermission(props.permission)

    if (isLoading) {
      return <>{loading}</>
    }

    if (!hasPermission) {
      if (showFallback && !fallback) {
        return (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access this feature.
            </AlertDescription>
          </Alert>
        )
      }
      return <>{fallback}</>
    }

    return <>{children}</>
  }

  // Handle multiple permissions
  if ('permissions' in props && props.permissions) {
    const { permissions, requireAll = false } = props

    const { hasAnyPermission, isLoading: isLoadingAny } = useHasAnyPermission(permissions)
    const { hasAllPermissions, isLoading: isLoadingAll } = useHasAllPermissions(permissions)

    const isLoading = requireAll ? isLoadingAll : isLoadingAny
    const hasRequiredPermissions = requireAll ? hasAllPermissions : hasAnyPermission

    if (isLoading) {
      return <>{loading}</>
    }

    if (!hasRequiredPermissions) {
      if (showFallback && !fallback) {
        return (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              You don't have the required permissions to access this feature.
              {requireAll ? ' All permissions are required.' : ' At least one permission is required.'}
            </AlertDescription>
          </Alert>
        )
      }
      return <>{fallback}</>
    }

    return <>{children}</>
  }

  // If neither permission nor permissions prop is provided, don't render anything
  console.warn('PermissionGate: Either "permission" or "permissions" prop must be provided')
  return <>{fallback}</>
}

/**
 * Higher-order component version of PermissionGate
 * 
 * @example
 * const ProtectedComponent = withPermission(MyComponent, 'users.view')
 * 
 * @example
 * const ProtectedComponent = withPermission(MyComponent, ['users.view', 'users.edit'], { requireAll: true })
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: string | string[],
  options: {
    requireAll?: boolean
    fallback?: React.ReactNode
    showFallback?: boolean
  } = {}
) {
  const { requireAll = false, fallback = null, showFallback = false } = options

  return function PermissionWrappedComponent(props: P) {
    if (typeof permission === 'string') {
      return (
        <PermissionGate 
          permission={permission} 
          fallback={fallback}
          showFallback={showFallback}
        >
          <WrappedComponent {...props} />
        </PermissionGate>
      )
    }

    return (
      <PermissionGate 
        permissions={permission} 
        requireAll={requireAll}
        fallback={fallback}
        showFallback={showFallback}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    )
  }
}

/**
 * Hook version for conditional logic in components
 * 
 * @example
 * function MyComponent() {
 *   const { canCreate, canEdit } = usePermissionCheck({
 *     canCreate: 'users.create',
 *     canEdit: 'users.edit'
 *   })
 *   
 *   return (
 *     <div>
 *       {canCreate && <Button>Create</Button>}
 *       {canEdit && <Button>Edit</Button>}
 *     </div>
 *   )
 * }
 */
export function usePermissionCheck<T extends Record<string, string | string[]>>(
  permissions: T
): Record<keyof T, boolean> {
  const result = {} as Record<keyof T, boolean>

  for (const [key, permission] of Object.entries(permissions)) {
    if (typeof permission === 'string') {
      const { hasPermission } = useHasPermission(permission)
      result[key as keyof T] = hasPermission
    } else if (Array.isArray(permission)) {
      const { hasAnyPermission } = useHasAnyPermission(permission)
      result[key as keyof T] = hasAnyPermission
    }
  }

  return result
}