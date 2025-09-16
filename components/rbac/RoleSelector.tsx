// components/rbac/RoleSelector.tsx - Role selection component with permission preview
'use client'

import React, { useState } from 'react'
import { useRoles, useRolePermissions, useAllPermissions } from '@/hooks/usePermissions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Crown, Star, Briefcase, HeadphonesIcon, Shield, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoleSelectorProps {
  value?: string
  onValueChange: (roleId: string) => void
  showPermissions?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

const getRoleIcon = (icon?: string) => {
  switch (icon) {
    case 'Crown':
      return Crown
    case 'Star':
      return Star
    case 'Briefcase':
      return Briefcase
    case 'HeadphonesIcon':
      return HeadphonesIcon
    default:
      return Shield
  }
}

export function RoleSelector({
  value,
  onValueChange,
  showPermissions = false,
  disabled = false,
  placeholder = "Select a role",
  className
}: RoleSelectorProps) {
  const [showPermissionDetails, setShowPermissionDetails] = useState(false)
  const { data: roles = [], isLoading: rolesLoading } = useRoles()
  const { data: rolePermissions = [] } = useRolePermissions(value || '')
  const { data: allPermissionsData } = useAllPermissions()

  const selectedRole = roles.find(role => role.id === value)

  // Group permissions by category for display
  const permissionsByCategory = React.useMemo(() => {
    if (!rolePermissions.length || !allPermissionsData?.permissions) return {}

    const grouped: Record<string, any[]> = {}
    
    rolePermissions.forEach(permissionId => {
      const permission = allPermissionsData.permissions.find((p: any) => p.id === permissionId)
      if (permission) {
        if (!grouped[permission.category]) {
          grouped[permission.category] = []
        }
        grouped[permission.category].push(permission)
      }
    })

    return grouped
  }, [rolePermissions, allPermissionsData])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'basic':
        return 'bg-green-100 text-green-800'
      case 'advanced':
        return 'bg-yellow-100 text-yellow-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryName = (category: string) => {
    const categoryNames: Record<string, string> = {
      dashboard: 'Dashboard & Overview',
      customers: 'Customer Management',
      bookings: 'Booking Management',
      sales: 'Sales & Billing',
      inventory: 'Inventory Management',
      staff: 'Staff Management',
      reports: 'Reports & Analytics',
      settings: 'System Settings',
      users: 'User Management'
    }
    return categoryNames[category] || category
  }

  if (rolesLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="h-10 bg-gray-200 animate-pulse rounded-md"></div>
        {showPermissions && (
          <div className="h-32 bg-gray-200 animate-pulse rounded-md"></div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Role Selection */}
      <div className="space-y-2">
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => {
              const IconComponent = getRoleIcon(role.icon)
              return (
                <SelectItem key={role.id} value={role.id}>
                  <div className="flex items-center gap-3 w-full">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", role.color)}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && (
                          <Badge variant="outline" className="text-xs">System</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{role.description}</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {role.permission_count || 0} permissions
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Role Info */}
      {selectedRole && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", selectedRole.color)}>
                  {React.createElement(getRoleIcon(selectedRole.icon), { className: "w-5 h-5" })}
                </div>
                <div>
                  <CardTitle className="text-lg">{selectedRole.name}</CardTitle>
                  <CardDescription>{selectedRole.description}</CardDescription>
                </div>
              </div>
              {showPermissions && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPermissionDetails(!showPermissionDetails)}
                >
                  {showPermissionDetails ? (
                    <EyeOff className="w-4 h-4 mr-2" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  {showPermissionDetails ? 'Hide' : 'Show'} Permissions
                </Button>
              )}
            </div>
          </CardHeader>

          {showPermissions && (
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                <span>Permissions: {rolePermissions.length}</span>
                {selectedRole.user_count !== undefined && (
                  <span>Users: {selectedRole.user_count}</span>
                )}
              </div>

              {showPermissionDetails && rolePermissions.length > 0 && (
                <>
                  <Separator className="mb-4" />
                  <div className="space-y-6 max-h-80 overflow-y-auto">
                    {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-sm">{getCategoryName(category)}</h4>
                          <Badge variant="outline" className="text-xs">
                            {permissions.length} permissions
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-2 ml-4">
                          {permissions.map((permission: any) => (
                            <div key={permission.id} className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{permission.name}</p>
                                <p className="text-xs text-gray-500">{permission.description}</p>
                              </div>
                              <Badge className={cn(getLevelColor(permission.level), "text-xs ml-2")}>
                                {permission.level}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {showPermissionDetails && rolePermissions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No permissions assigned to this role</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}

/**
 * Compact role selector for forms
 */
export function CompactRoleSelector({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select role",
  className
}: Omit<RoleSelectorProps, 'showPermissions'>) {
  const { data: roles = [], isLoading } = useRoles()

  if (isLoading) {
    return <div className={cn("h-10 bg-gray-200 animate-pulse rounded-md", className)}></div>
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            <div className="flex items-center gap-2">
              <Badge className={role.color} variant="secondary">
                {role.name}
              </Badge>
              <span className="text-xs text-gray-500">
                ({role.permission_count || 0} permissions)
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Role badge component for displaying role information
 */
export function RoleBadge({ 
  roleId, 
  showIcon = true, 
  showPermissionCount = false,
  className 
}: { 
  roleId: string
  showIcon?: boolean
  showPermissionCount?: boolean
  className?: string 
}) {
  const { data: roles = [] } = useRoles()
  const role = roles.find(r => r.id === roleId)

  if (!role) {
    return (
      <Badge variant="outline" className={className}>
        Unknown Role
      </Badge>
    )
  }

  const IconComponent = getRoleIcon(role.icon)

  return (
    <Badge className={cn(role.color, className)} variant="secondary">
      <div className="flex items-center gap-1">
        {showIcon && <IconComponent className="w-3 h-3" />}
        <span>{role.name}</span>
        {showPermissionCount && (
          <span className="text-xs opacity-75">
            ({role.permission_count || 0})
          </span>
        )}
      </div>
    </Badge>
  )
}