# 🔐 RBAC System Setup Guide

## 📋 What I've Implemented

I've created a complete Role-Based Access Control (RBAC) system for your salon management application. Here's what's been built:

### ✅ **Database Schema** (`database/rbac-schema.sql`)
- Complete PostgreSQL schema with 6 core tables
- Row Level Security (RLS) policies enabled
- 47 permissions across 9 categories
- 5 pre-built role templates
- Audit logging with automatic triggers
- Helper functions for permission checking

### ✅ **Backend APIs** (`app/api/`)
```
/api/users          - User management
/api/users/[id]     - Individual user operations
/api/roles          - Role management  
/api/roles/[id]     - Individual role operations
/api/permissions    - Permission management
```

### ✅ **Middleware & Security** (`middleware.ts`, `lib/rbac.ts`)
- Route protection with permission checking
- RBAC utility functions
- Audit logging capabilities
- IP tracking and user agent logging

### ✅ **React Hooks & Components** (`hooks/`, `components/rbac/`)
- `usePermissions()` - Permission management hooks
- `<PermissionGate>` - Conditional rendering component
- `<RoleSelector>` - Role selection with permission preview
- `<PermissionMatrix>` - Interactive permission assignment

### ✅ **UI Integration**
- Unauthorized access page with helpful error messages
- Integration-ready components for your existing user-management page

---

## 🚀 Setup Instructions

### **Step 1: Database Setup**

Execute the complete SQL script in your Neon PostgreSQL database:

```bash
# Connect to your Neon PostgreSQL database
psql "postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/salon_management"

# Execute the schema
\i database/rbac-schema.sql
```

**Or copy-paste the entire contents of `database/rbac-schema.sql` into your database console.**

### **Step 2: Environment Variables**

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

**Required variables:**
```env
# Your Neon PostgreSQL connection
NEON_DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/salon_management

# NextAuth for session management
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# Application security
JWT_SECRET=your_jwt_secret
```

### **Step 3: Install Dependencies**

```bash
# Install additional required packages
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs @tanstack/react-query
```

### **Step 4: Update Your User Management Page**

Your existing `app/user-management/page.tsx` needs to be connected to the real APIs. Here's how:

```typescript
// Replace the mock data in your user-management/page.tsx with:
import { useUsers, useRoles, useCreateUser, useUpdateUser } from '@/hooks/usePermissions'

// In your component:
const { data: users, isLoading } = useUsers()
const { data: roles } = useRoles()
const createUserMutation = useCreateUser()
const updateUserMutation = useUpdateUser()
```

### **Step 5: Add Query Client Provider**

Wrap your app with React Query provider in `app/layout.tsx`:

```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

---

## 🔧 Configuration Options

### **Permission Categories** (9 total)
1. **Dashboard & Overview** - 3 permissions
2. **Customer Management** - 6 permissions  
3. **Booking Management** - 6 permissions
4. **Sales & Billing** - 6 permissions
5. **Inventory Management** - 5 permissions
6. **Staff Management** - 6 permissions
7. **Reports & Analytics** - 5 permissions
8. **System Settings** - 4 permissions
9. **User Management** - 6 permissions

### **Permission Levels**
- 🟢 **Basic** - Day-to-day operations
- 🟡 **Advanced** - Elevated operations
- 🔴 **Critical** - High-risk operations

### **Role Templates**
1. **Administrator** - All permissions (system role)
2. **Salon Owner** - Complete business access
3. **Senior Manager** - Advanced management
4. **Shift Supervisor** - Daily operations
5. **Senior Stylist** - Service operations
6. **Customer Service** - Customer support

---

## 🛡️ Security Features

### **Row Level Security (RLS)**
- Users can only see data they have permissions for
- Automatic permission checking at database level
- Prevents data leaks even if application logic fails

### **Audit Logging**
- All user/role/permission changes are logged
- IP address and user agent tracking
- Automatic triggers for database changes

### **Route Protection**
- Middleware checks permissions before page access
- API endpoints protected with permission requirements
- Graceful error handling with helpful messages

---

## 📝 Usage Examples

### **Protect a Component**
```typescript
import { PermissionGate } from '@/components/rbac'

<PermissionGate permission="users.create">
  <Button>Create User</Button>
</PermissionGate>
```

### **Check Multiple Permissions**
```typescript
<PermissionGate permissions={["customers.view", "customers.edit"]}>
  <CustomerForm />
</PermissionGate>
```

### **Use in Logic**
```typescript
import { usePermissionCheck } from '@/components/rbac'

function MyComponent() {
  const { canCreate, canDelete } = usePermissionCheck({
    canCreate: 'users.create',
    canDelete: 'users.delete'
  })
  
  return (
    <div>
      {canCreate && <CreateButton />}
      {canDelete && <DeleteButton />}
    </div>
  )
}
```

---

## 🧪 Testing the System

### **1. Database Test**
```sql
-- Test permission function
SELECT * FROM user_effective_permissions('admin-user-001');

-- Test permission check
SELECT user_has_permission('admin-user-001', 'users.create');
```

### **2. API Test**
```bash
# Test user API (after authentication)
curl -X GET http://localhost:3000/api/users

# Test roles API
curl -X GET http://localhost:3000/api/roles
```

### **3. UI Test**
1. Navigate to `/user-management`
2. Try creating/editing users
3. Test role assignments
4. Verify permission restrictions

---

## 🚨 Important Security Notes

### **Default Admin User**
- Email: `admin@salon.com`
- **Change the default password immediately!**
- This user has all permissions

### **Critical Permissions**
These require special authorization:
- `users.delete` - Delete users
- `settings.edit` - System settings
- `sales.void` - Void transactions
- `staff.payroll` - Payroll access

### **System Roles**
- Cannot be modified or deleted
- Use as templates for custom roles
- Administrator role cannot be changed

---

## 🔄 Next Steps

1. **Execute the database schema** - Most important step
2. **Configure environment variables** - Required for authentication
3. **Test with your existing UI** - Integrate the hooks and components
4. **Customize permissions** - Add/modify permissions as needed
5. **Set up proper authentication** - Connect with your auth system

---

## 📞 Need Help?

If you encounter any issues:

1. **Database Issues**: Check the SQL script execution and connection strings
2. **Permission Errors**: Verify the user has correct role assignments
3. **API Errors**: Check authentication and environment variables
4. **UI Issues**: Ensure React Query is properly configured

The system is designed to be secure by default - if something doesn't work, it's likely a permission issue, which means the security is working correctly!

---

## 🎯 **What You Need to Do:**

1. **Execute `database/rbac-schema.sql` in your Neon PostgreSQL database**
2. **Configure environment variables in `.env.local`**
3. **Install required dependencies**
4. **Test the system with your existing user-management page**

Everything else is ready to go! 🚀