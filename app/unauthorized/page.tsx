// app/unauthorized/page.tsx - Unauthorized access page
'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, ArrowLeft, Home, Shield } from 'lucide-react'
import { useUserPermissions } from '@/hooks/usePermissions'
import { useSession } from 'next-auth/react'

export default function UnauthorizedPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: userPermissions = [] } = useUserPermissions()

  const requiredPermissions = searchParams.get('required')?.split(',') || []
  const attemptedPath = searchParams.get('attempted') || 'this resource'

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/dashboard')
    }
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  const getPermissionName = (permissionId: string) => {
    const permissionNames: Record<string, string> = {
      'users.view': 'View Users',
      'users.create': 'Create Users',
      'users.edit': 'Edit Users',
      'users.delete': 'Delete Users',
      'users.roles': 'Manage Roles',
      'users.permissions': 'Assign Permissions',
      'dashboard.view': 'View Dashboard',
      'dashboard.analytics': 'View Analytics',
      'customers.view': 'View Customers',
      'customers.create': 'Create Customers',
      'customers.edit': 'Edit Customers',
      'customers.delete': 'Delete Customers',
      'bookings.view': 'View Bookings',
      'bookings.create': 'Create Bookings',
      'bookings.edit': 'Edit Bookings',
      'sales.view': 'View Sales',
      'sales.create': 'Process Sales',
      'sales.refund': 'Process Refunds',
      'inventory.view': 'View Inventory',
      'inventory.manage': 'Manage Inventory',
      'staff.view': 'View Staff',
      'staff.create': 'Create Staff',
      'staff.edit': 'Edit Staff',
      'reports.view': 'View Reports',
      'reports.advanced': 'Advanced Reports',
      'settings.view': 'View Settings',
      'settings.edit': 'Edit Settings'
    }
    return permissionNames[permissionId] || permissionId
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Main Error Card */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">Access Denied</CardTitle>
            <CardDescription className="text-red-600">
              You don't have the required permissions to access {attemptedPath}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {requiredPermissions.length > 0 && (
              <div>
                <p className="text-sm text-red-700 mb-2">Required permissions:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {requiredPermissions.map((permission) => (
                    <Badge key={permission} variant="destructive">
                      <Shield className="w-3 h-3 mr-1" />
                      {getPermissionName(permission)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={handleGoBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={handleGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Info Card */}
        {session?.user && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Account Information</CardTitle>
              <CardDescription>
                Current user permissions and access level
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">User</p>
                  <p className="text-lg">{session.user.name || session.user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Permissions</p>
                  <p className="text-lg">{userPermissions.length} permissions</p>
                </div>
              </div>

              {userPermissions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Your Current Permissions</p>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {userPermissions.slice(0, 20).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {getPermissionName(permission)}
                      </Badge>
                    ))}
                    {userPermissions.length > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{userPermissions.length - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">
                  If you believe you should have access to this feature, please contact your administrator 
                  or salon manager to request the necessary permissions.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">For Employees:</p>
                <p className="text-gray-600">
                  Contact your manager or supervisor to request additional permissions for your role.
                </p>
              </div>
              <div>
                <p className="font-medium">For Managers:</p>
                <p className="text-gray-600">
                  Access the User Management section to assign roles and permissions to team members.
                </p>
              </div>
              <div>
                <p className="font-medium">For System Administrators:</p>
                <p className="text-gray-600">
                  Review user roles and permissions in the admin panel to ensure proper access control.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}