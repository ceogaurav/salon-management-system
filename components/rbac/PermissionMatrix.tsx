// components/rbac/PermissionMatrix.tsx - Interactive permission selection matrix
'use client'

import React, { useState, useMemo } from 'react'
import { useAllPermissions } from '@/hooks/usePermissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Search, Shield, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PermissionMatrixProps {
  selectedPermissions: string[]
  onPermissionsChange: (permissions: string[]) => void
  disabled?: boolean
  showLevelFilter?: boolean
  showCategoryFilter?: boolean
  showSearch?: boolean
  className?: string
}

export function PermissionMatrix({
  selectedPermissions,
  onPermissionsChange,
  disabled = false,
  showLevelFilter = true,
  showCategoryFilter = true,
  showSearch = true,
  className
}: PermissionMatrixProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const { data: allPermissionsData, isLoading } = useAllPermissions()
  const permissions = allPermissionsData?.permissions || []
  const permissionsByCategory = allPermissionsData?.permissionsByCategory || {}

  // Filter permissions based on search, level, and category
  const filteredPermissions = useMemo(() => {
    let filtered = permissions

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(permission =>
        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(permission => permission.level === levelFilter)
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(permission => permission.category === categoryFilter)
    }

    return filtered
  }, [permissions, searchTerm, levelFilter, categoryFilter])

  // Group filtered permissions by category
  const filteredByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    
    filteredPermissions.forEach(permission => {
      if (!grouped[permission.category]) {
        grouped[permission.category] = []
      }
      grouped[permission.category].push(permission)
    })

    return grouped
  }, [filteredPermissions])

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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'basic':
        return CheckCircle2
      case 'advanced':
        return AlertCircle
      case 'critical':
        return XCircle
      default:
        return Shield
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

  const handlePermissionToggle = (permissionId: string) => {
    if (disabled) return

    const isSelected = selectedPermissions.includes(permissionId)
    if (isSelected) {
      onPermissionsChange(selectedPermissions.filter(id => id !== permissionId))
    } else {
      onPermissionsChange([...selectedPermissions, permissionId])
    }
  }

  const handleCategoryToggle = (category: string) => {
    if (disabled) return

    const categoryPermissions = permissionsByCategory[category]?.map((p: any) => p.id) || []
    const allSelected = categoryPermissions.every((id: string) => selectedPermissions.includes(id))

    if (allSelected) {
      // Remove all category permissions
      onPermissionsChange(
        selectedPermissions.filter(id => !categoryPermissions.includes(id))
      )
    } else {
      // Add all category permissions
      const newPermissions = [...new Set([...selectedPermissions, ...categoryPermissions])]
      onPermissionsChange(newPermissions)
    }
  }

  const handleSelectAll = () => {
    if (disabled) return
    onPermissionsChange(filteredPermissions.map(p => p.id))
  }

  const handleSelectNone = () => {
    if (disabled) return
    onPermissionsChange([])
  }

  const getStatistics = () => {
    const total = permissions.length
    const selected = selectedPermissions.length
    const basic = selectedPermissions.filter(id => {
      const perm = permissions.find(p => p.id === id)
      return perm?.level === 'basic'
    }).length
    const advanced = selectedPermissions.filter(id => {
      const perm = permissions.find(p => p.id === id)
      return perm?.level === 'advanced'
    }).length
    const critical = selectedPermissions.filter(id => {
      const perm = permissions.find(p => p.id === id)
      return perm?.level === 'critical'
    }).length

    return { total, selected, basic, advanced, critical }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="h-32 bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-64 bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    )
  }

  const stats = getStatistics()

  return (
    <div className={cn("space-y-6", className)}>
      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permission Selection
          </CardTitle>
          <CardDescription>
            Select permissions to assign to the role. {stats.selected} of {stats.total} permissions selected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.selected}</div>
              <div className="text-sm text-gray-500">Selected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.basic}</div>
              <div className="text-sm text-gray-500">Basic</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.advanced}</div>
              <div className="text-sm text-gray-500">Advanced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-gray-500">Critical</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectAll}
              disabled={disabled}
            >
              Select All Filtered
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSelectNone}
              disabled={disabled}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      {(showSearch || showLevelFilter || showCategoryFilter) && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search permissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}

              {showLevelFilter && (
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Levels</option>
                  <option value="basic">Basic Only</option>
                  <option value="advanced">Advanced Only</option>
                  <option value="critical">Critical Only</option>
                </select>
              )}

              {showCategoryFilter && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {Object.keys(permissionsByCategory).map(category => (
                    <option key={category} value={category}>
                      {getCategoryName(category)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Matrix */}
      <div className="space-y-6">
        {Object.entries(filteredByCategory).map(([category, categoryPermissions]) => {
          const allSelected = categoryPermissions.every((p: any) => selectedPermissions.includes(p.id))
          const someSelected = categoryPermissions.some((p: any) => selectedPermissions.includes(p.id))

          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={allSelected}
                      ref={(ref) => {
                        if (ref) ref.indeterminate = someSelected && !allSelected
                      }}
                      onCheckedChange={() => handleCategoryToggle(category)}
                      disabled={disabled}
                    />
                    <div>
                      <CardTitle className="text-lg">{getCategoryName(category)}</CardTitle>
                      <CardDescription>
                        {categoryPermissions.filter((p: any) => selectedPermissions.includes(p.id)).length} of{' '}
                        {categoryPermissions.length} permissions selected
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {categoryPermissions.length} permissions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryPermissions.map((permission: any) => {
                    const LevelIcon = getLevelIcon(permission.level)
                    const isSelected = selectedPermissions.includes(permission.id)

                    return (
                      <div
                        key={permission.id}
                        className={cn(
                          "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                          isSelected ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200",
                          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-100"
                        )}
                        onClick={() => !disabled && handlePermissionToggle(permission.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handlePermissionToggle(permission.id)}
                          disabled={disabled}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{permission.name}</span>
                            <Badge className={cn(getLevelColor(permission.level), "text-xs")}>
                              <LevelIcon className="w-3 h-3 mr-1" />
                              {permission.level}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">{permission.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {Object.keys(filteredByCategory).length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No permissions match your current filters</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setSearchTerm('')
                  setLevelFilter('all')
                  setCategoryFilter('all')
                }}
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}