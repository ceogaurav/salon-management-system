# RBAC Implementation Guide for Salon Management System

## 🔐 System Overview

Your user-management page implements a comprehensive Role-Based Access Control (RBAC) system with:

- **9 Permission Categories** with 47 total permissions
- **3 Permission Levels**: basic, advanced, critical
- **5 Role Templates** + custom roles
- **Granular user management** with permission overrides

## 🗄️ Database Schema

### Core Tables Required

```sql
-- Users table
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  role_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  department VARCHAR(255),
  employee_id VARCHAR(50),
  custom_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  avatar_url VARCHAR(500),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Roles table
CREATE TABLE roles (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(100),
  icon VARCHAR(50),
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255)
);

-- Permissions table
CREATE TABLE permissions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  level ENUM('basic', 'advanced', 'critical') DEFAULT 'basic'
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
  role_id VARCHAR(255),
  permission_id VARCHAR(255),
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- User-Permission overrides
CREATE TABLE user_permissions (
  user_id VARCHAR(255),
  permission_id VARCHAR(255),
  granted BOOLEAN DEFAULT true,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

## 🔧 Backend API Implementation

### 1. Permission Check Middleware

```typescript
// middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getUserPermissions } from '@/lib/rbac'

export function withPermission(requiredPermission: string) {
  return async function(req: NextRequest) {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPermissions = await getUserPermissions(session.user.id)
    
    if (!userPermissions.includes(requiredPermission)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return NextResponse.next()
  }
}
```

### 2. RBAC Utility Functions

```typescript
// lib/rbac.ts
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: true
        }
      },
      userPermissions: true
    }
  })

  if (!user) return []

  // Start with role permissions
  let permissions = user.role?.permissions.map(p => p.permission_id) || []

  // Apply user-specific overrides
  user.userPermissions.forEach(override => {
    if (override.granted) {
      // Add permission if not already present
      if (!permissions.includes(override.permission_id)) {
        permissions.push(override.permission_id)
      }
    } else {
      // Remove permission
      permissions = permissions.filter(p => p !== override.permission_id)
    }
  })

  return permissions
}

export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  return userPermissions.includes(requiredPermission)
}

export function hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

export function hasAllPermissions(userPermissions: string[], requiredPermissions: string[]): boolean {
  return requiredPermissions.every(permission => userPermissions.includes(permission))
}
```

### 3. API Routes

```typescript
// app/api/users/route.ts
import { withPermission } from '@/middleware/auth'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // Check permission before processing
  const permissionCheck = await withPermission('users.view')(req)
  if (permissionCheck.status !== 200) return permissionCheck

  // Fetch users logic
  const users = await db.user.findMany({
    include: {
      role: true
    }
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const permissionCheck = await withPermission('users.create')(req)
  if (permissionCheck.status !== 200) return permissionCheck

  // Create user logic
  const data = await req.json()
  const newUser = await db.user.create({
    data: {
      ...data,
      id: generateId()
    }
  })

  return NextResponse.json(newUser)
}
```

## 🎨 Frontend Integration

### 1. Permission Hook

```typescript
// hooks/usePermissions.ts
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'

export function usePermissions() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['permissions', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return []
      const response = await fetch(`/api/users/${session.user.id}/permissions`)
      return response.json()
    },
    enabled: !!session?.user?.id
  })
}

export function useHasPermission(permission: string) {
  const { data: permissions = [] } = usePermissions()
  return permissions.includes(permission)
}
```

### 2. Permission Components

```typescript
// components/PermissionGate.tsx
import { useHasPermission } from '@/hooks/usePermissions'

interface PermissionGateProps {
  permission: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ permission, fallback = null, children }: PermissionGateProps) {
  const hasPermission = useHasPermission(permission)

  if (!hasPermission) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Usage in components
<PermissionGate permission="customers.create">
  <Button onClick={handleCreateCustomer}>
    Add Customer
  </Button>
</PermissionGate>
```

### 3. Route Protection

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PROTECTED_ROUTES = {
  '/user-management': ['users.view'],
  '/manage/staff': ['staff.view'],
  '/analytics': ['dashboard.analytics'],
  // Add more routes and their required permissions
}

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const pathname = req.nextUrl.pathname

  // Check if route requires permissions
  const requiredPermissions = PROTECTED_ROUTES[pathname]
  if (requiredPermissions && token) {
    const userPermissions = await getUserPermissions(token.sub!)
    
    const hasRequiredPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    )

    if (!hasRequiredPermission) {
      return NextResponse.redirect(new URL('/unauthorized', req.url))
    }
  }

  return NextResponse.next()
}
```

## 📊 Data Population

### Seed the Permissions

```typescript
// scripts/seed-permissions.ts
const PERMISSION_CATEGORIES = [
  {
    id: "dashboard",
    name: "Dashboard & Overview",
    permissions: [
      { id: "dashboard.view", name: "View Dashboard", level: "basic" },
      { id: "dashboard.analytics", name: "View Analytics", level: "advanced" },
      { id: "dashboard.export", name: "Export Dashboard Data", level: "advanced" }
    ]
  },
  // ... more categories from your user-management page
]

async function seedPermissions() {
  for (const category of PERMISSION_CATEGORIES) {
    for (const permission of category.permissions) {
      await db.permission.upsert({
        where: { id: permission.id },
        update: {},
        create: {
          id: permission.id,
          name: permission.name,
          description: permission.description || "",
          category: category.id,
          level: permission.level
        }
      })
    }
  }
}
```

## 🚀 Management Best Practices

### 1. Role Hierarchy
- **Salon Owner**: All permissions (highest level)
- **Senior Manager**: Most permissions except critical system settings
- **Shift Supervisor**: Operational permissions for daily management
- **Senior Stylist**: Service-focused permissions
- **Customer Service**: Customer and booking management

### 2. Permission Levels
- **Basic**: Day-to-day operations (green)
- **Advanced**: Elevated operations requiring experience (yellow)
- **Critical**: High-risk operations requiring special authorization (red)

### 3. Security Guidelines
- Never grant critical permissions by default
- Implement permission auditing and logging
- Regular permission reviews for compliance
- Use principle of least privilege
- Monitor and alert on permission changes

### 4. User Onboarding Flow
1. Create user with basic customer service role
2. Train user on basic functions
3. Gradually elevate permissions based on competency
4. Regular review and adjustment of permissions

## 🔍 Monitoring & Auditing

```typescript
// lib/audit.ts
export async function logPermissionChange(
  userId: string,
  targetUserId: string,
  action: 'grant' | 'revoke',
  permission: string
) {
  await db.auditLog.create({
    data: {
      userId,
      action: `permission_${action}`,
      targetType: 'user',
      targetId: targetUserId,
      details: { permission },
      timestamp: new Date()
    }
  })
}
```

This implementation provides a robust, scalable RBAC system that matches your current UI design while ensuring security and flexibility for salon management operations.