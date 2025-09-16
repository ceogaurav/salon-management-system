-- =====================================================
-- SALON MANAGEMENT SYSTEM - RBAC DATABASE SCHEMA
-- Complete PostgreSQL script with RLS policies
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE RBAC TABLES
-- =====================================================

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS user_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- Permissions table
CREATE TABLE permissions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'basic' CHECK (level IN ('basic', 'advanced', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(100) DEFAULT 'bg-gray-100 text-gray-800',
    icon VARCHAR(50),
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255),
    role_id VARCHAR(255) REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    department VARCHAR(255),
    employee_id VARCHAR(50) UNIQUE,
    avatar_url VARCHAR(500),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Role-Permission mapping
CREATE TABLE role_permissions (
    role_id VARCHAR(255) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(255) REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- User-Permission overrides (for custom permissions beyond role)
CREATE TABLE user_permissions (
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    permission_id VARCHAR(255) REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    PRIMARY KEY (user_id, permission_id)
);

-- Audit logs for tracking permission changes
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_employee_id ON users(employee_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_level ON permissions(level);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users table
CREATE POLICY users_policy ON users
    USING (
        -- Users can see their own data
        auth.uid()::text = id 
        OR 
        -- Or users with user management permissions can see all users
        EXISTS (
            SELECT 1 FROM user_effective_permissions(auth.uid()::text) 
            WHERE permission_id = 'users.view'
        )
    );

-- Create policy for roles table  
CREATE POLICY roles_policy ON roles
    USING (
        -- Users with role management permissions can see all roles
        EXISTS (
            SELECT 1 FROM user_effective_permissions(auth.uid()::text) 
            WHERE permission_id IN ('users.roles', 'users.view')
        )
    );

-- Create policy for permissions table
CREATE POLICY permissions_policy ON permissions
    USING (
        -- Users with permission management can see all permissions
        EXISTS (
            SELECT 1 FROM user_effective_permissions(auth.uid()::text) 
            WHERE permission_id IN ('users.permissions', 'users.view')
        )
    );

-- Create policy for role_permissions table
CREATE POLICY role_permissions_policy ON role_permissions
    USING (
        EXISTS (
            SELECT 1 FROM user_effective_permissions(auth.uid()::text) 
            WHERE permission_id IN ('users.roles', 'users.view')
        )
    );

-- Create policy for user_permissions table
CREATE POLICY user_permissions_policy ON user_permissions
    USING (
        -- Users can see their own permission overrides
        auth.uid()::text = user_id 
        OR 
        -- Or users with permission management can see all
        EXISTS (
            SELECT 1 FROM user_effective_permissions(auth.uid()::text) 
            WHERE permission_id IN ('users.permissions', 'users.view')
        )
    );

-- Create policy for audit_logs table
CREATE POLICY audit_logs_policy ON audit_logs
    USING (
        -- Only users with advanced system permissions can view audit logs
        EXISTS (
            SELECT 1 FROM user_effective_permissions(auth.uid()::text) 
            WHERE permission_id IN ('settings.view', 'users.view')
        )
    );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all effective permissions for a user (role + overrides)
CREATE OR REPLACE FUNCTION user_effective_permissions(target_user_id TEXT)
RETURNS TABLE(permission_id TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.id
    FROM permissions p
    WHERE p.id IN (
        -- Permissions from user's role
        SELECT rp.permission_id 
        FROM users u
        JOIN role_permissions rp ON u.role_id = rp.role_id
        WHERE u.id = target_user_id AND u.is_active = true
        
        UNION
        
        -- Additional permissions granted directly to user
        SELECT up.permission_id
        FROM user_permissions up
        WHERE up.user_id = target_user_id AND up.granted = true
    )
    AND p.id NOT IN (
        -- Exclude permissions explicitly revoked from user
        SELECT up.permission_id
        FROM user_permissions up
        WHERE up.user_id = target_user_id AND up.granted = false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(target_user_id TEXT, required_permission TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_effective_permissions(target_user_id) 
        WHERE permission_id = required_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id TEXT,
    p_action TEXT,
    p_target_type TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (user_id, action, target_type, target_id, details, ip_address, user_agent)
    VALUES (p_user_id, p_action, p_target_type, p_target_id, p_details, p_ip_address, p_user_agent)
    RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUDIT LOGGING
-- =====================================================

-- Function to automatically log user changes
CREATE OR REPLACE FUNCTION audit_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.created_by,
            'user_created',
            'user',
            NEW.id,
            jsonb_build_object('name', NEW.name, 'email', NEW.email, 'role_id', NEW.role_id)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_event(
            COALESCE(NEW.created_by, OLD.created_by),
            'user_updated',
            'user',
            NEW.id,
            jsonb_build_object(
                'old_values', jsonb_build_object('name', OLD.name, 'email', OLD.email, 'role_id', OLD.role_id, 'is_active', OLD.is_active),
                'new_values', jsonb_build_object('name', NEW.name, 'email', NEW.email, 'role_id', NEW.role_id, 'is_active', NEW.is_active)
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_event(
            OLD.created_by,
            'user_deleted',
            'user',
            OLD.id,
            jsonb_build_object('name', OLD.name, 'email', OLD.email)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user audit logging
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_user_changes();

-- Function to automatically log role changes
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.created_by,
            'role_created',
            'role',
            NEW.id,
            jsonb_build_object('name', NEW.name, 'description', NEW.description)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_event(
            COALESCE(NEW.created_by, OLD.created_by),
            'role_updated',
            'role',
            NEW.id,
            jsonb_build_object(
                'old_values', jsonb_build_object('name', OLD.name, 'description', OLD.description),
                'new_values', jsonb_build_object('name', NEW.name, 'description', NEW.description)
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM log_audit_event(
            OLD.created_by,
            'role_deleted',
            'role',
            OLD.id,
            jsonb_build_object('name', OLD.name)
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role audit logging
CREATE TRIGGER audit_roles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_role_changes();

-- =====================================================
-- SEED DATA - PERMISSIONS
-- =====================================================

-- Dashboard & Overview permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('dashboard.view', 'View Dashboard', 'Access main dashboard', 'dashboard', 'basic'),
('dashboard.analytics', 'View Analytics', 'Access analytics widgets', 'dashboard', 'advanced'),
('dashboard.export', 'Export Dashboard Data', 'Export dashboard reports', 'dashboard', 'advanced');

-- Customer Management permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('customers.view', 'View Customers', 'View customer list and details', 'customers', 'basic'),
('customers.create', 'Create Customers', 'Add new customers', 'customers', 'basic'),
('customers.edit', 'Edit Customers', 'Modify customer information', 'customers', 'basic'),
('customers.delete', 'Delete Customers', 'Remove customers from system', 'customers', 'critical'),
('customers.export', 'Export Customer Data', 'Export customer information', 'customers', 'advanced'),
('customers.import', 'Import Customer Data', 'Bulk import customers', 'customers', 'advanced');

-- Booking Management permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('bookings.view', 'View Bookings', 'View appointment calendar and bookings', 'bookings', 'basic'),
('bookings.create', 'Create Bookings', 'Schedule new appointments', 'bookings', 'basic'),
('bookings.edit', 'Edit Bookings', 'Modify existing appointments', 'bookings', 'basic'),
('bookings.cancel', 'Cancel Bookings', 'Cancel appointments', 'bookings', 'advanced'),
('bookings.reschedule', 'Reschedule Bookings', 'Move appointments to different times', 'bookings', 'basic'),
('bookings.bulk_operations', 'Bulk Booking Operations', 'Perform bulk actions on bookings', 'bookings', 'advanced');

-- Sales & Billing permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('sales.view', 'View Sales', 'View sales transactions', 'sales', 'basic'),
('sales.create', 'Create Sales', 'Process new sales', 'sales', 'basic'),
('sales.refund', 'Process Refunds', 'Issue refunds for sales', 'sales', 'advanced'),
('sales.discount', 'Apply Discounts', 'Apply discounts to sales', 'sales', 'advanced'),
('sales.void', 'Void Transactions', 'Void sales transactions', 'sales', 'critical'),
('sales.reports', 'Sales Reports', 'Access detailed sales reports', 'sales', 'advanced');

-- Inventory Management permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('inventory.view', 'View Inventory', 'View product inventory', 'inventory', 'basic'),
('inventory.manage', 'Manage Inventory', 'Add, edit, and remove products', 'inventory', 'advanced'),
('inventory.adjust', 'Adjust Stock', 'Adjust stock levels', 'inventory', 'advanced'),
('inventory.purchase', 'Purchase Orders', 'Create and manage purchase orders', 'inventory', 'advanced'),
('inventory.suppliers', 'Manage Suppliers', 'Manage supplier information', 'inventory', 'advanced');

-- Staff Management permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('staff.view', 'View Staff', 'View staff list and details', 'staff', 'basic'),
('staff.create', 'Create Staff', 'Add new staff members', 'staff', 'advanced'),
('staff.edit', 'Edit Staff', 'Modify staff information', 'staff', 'advanced'),
('staff.delete', 'Delete Staff', 'Remove staff members', 'staff', 'critical'),
('staff.schedules', 'Manage Schedules', 'Manage staff schedules', 'staff', 'advanced'),
('staff.payroll', 'View Payroll', 'Access payroll information', 'staff', 'critical');

-- Reports & Analytics permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('reports.view', 'View Reports', 'Access basic reports', 'reports', 'basic'),
('reports.advanced', 'Advanced Reports', 'Access detailed analytics', 'reports', 'advanced'),
('reports.export', 'Export Reports', 'Export reports to various formats', 'reports', 'advanced'),
('reports.financial', 'Financial Reports', 'Access financial reports', 'reports', 'critical'),
('reports.custom', 'Custom Reports', 'Create custom reports', 'reports', 'advanced');

-- System Settings permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('settings.view', 'View Settings', 'View system settings', 'settings', 'basic'),
('settings.edit', 'Edit Settings', 'Modify system settings', 'settings', 'critical'),
('settings.backup', 'Backup & Restore', 'Perform system backups', 'settings', 'critical'),
('settings.integrations', 'Manage Integrations', 'Configure third-party integrations', 'settings', 'advanced');

-- User Management permissions
INSERT INTO permissions (id, name, description, category, level) VALUES
('users.view', 'View Users', 'View user list', 'users', 'advanced'),
('users.create', 'Create Users', 'Add new users', 'users', 'critical'),
('users.edit', 'Edit Users', 'Modify user information', 'users', 'critical'),
('users.delete', 'Delete Users', 'Remove users from system', 'users', 'critical'),
('users.roles', 'Manage Roles', 'Create and manage user roles', 'users', 'critical'),
('users.permissions', 'Assign Permissions', 'Assign permissions to users', 'users', 'critical');

-- =====================================================
-- SEED DATA - ROLES
-- =====================================================

-- System Administrator role (unchangeable)
INSERT INTO roles (id, name, description, color, icon, is_system, created_by) VALUES
('admin', 'Administrator', 'Full system access with all permissions', 'bg-red-100 text-red-800', 'Crown', true, 'system');

-- Role Templates
INSERT INTO roles (id, name, description, color, icon, is_system, created_by) VALUES
('salon_owner', 'Salon Owner', 'Complete access to all salon operations and management', 'bg-purple-100 text-purple-800', 'Crown', false, 'system'),
('senior_manager', 'Senior Manager', 'Advanced management access with most permissions', 'bg-blue-100 text-blue-800', 'Star', false, 'system'),
('shift_supervisor', 'Shift Supervisor', 'Supervise daily operations and staff during shifts', 'bg-green-100 text-green-800', 'Briefcase', false, 'system'),
('senior_stylist', 'Senior Stylist', 'Experienced stylist with additional responsibilities', 'bg-orange-100 text-orange-800', 'Star', false, 'system'),
('customer_service', 'Customer Service', 'Handle customer inquiries and support', 'bg-pink-100 text-pink-800', 'HeadphonesIcon', false, 'system');

-- =====================================================
-- SEED DATA - ROLE PERMISSIONS
-- =====================================================

-- Administrator - All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'admin', id FROM permissions;

-- Salon Owner - All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'salon_owner', id FROM permissions;

-- Senior Manager - Most permissions except critical system settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'senior_manager', id FROM permissions 
WHERE level != 'critical' OR category = 'sales';

-- Shift Supervisor - Operational permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('shift_supervisor', 'dashboard.view'),
('shift_supervisor', 'dashboard.analytics'),
('shift_supervisor', 'customers.view'),
('shift_supervisor', 'customers.create'),
('shift_supervisor', 'customers.edit'),
('shift_supervisor', 'bookings.view'),
('shift_supervisor', 'bookings.create'),
('shift_supervisor', 'bookings.edit'),
('shift_supervisor', 'bookings.reschedule'),
('shift_supervisor', 'sales.view'),
('shift_supervisor', 'sales.create'),
('shift_supervisor', 'sales.discount'),
('shift_supervisor', 'inventory.view'),
('shift_supervisor', 'staff.view'),
('shift_supervisor', 'staff.schedules'),
('shift_supervisor', 'reports.view');

-- Senior Stylist - Service-focused permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
('senior_stylist', 'dashboard.view'),
('senior_stylist', 'customers.view'),
('senior_stylist', 'customers.create'),
('senior_stylist', 'customers.edit'),
('senior_stylist', 'bookings.view'),
('senior_stylist', 'bookings.create'),
('senior_stylist', 'bookings.edit'),
('senior_stylist', 'bookings.reschedule'),
('senior_stylist', 'sales.view'),
('senior_stylist', 'sales.create'),
('senior_stylist', 'inventory.view'),
('senior_stylist', 'staff.view');

-- Customer Service - Customer and booking management
INSERT INTO role_permissions (role_id, permission_id) VALUES
('customer_service', 'dashboard.view'),
('customer_service', 'customers.view'),
('customer_service', 'customers.create'),
('customer_service', 'customers.edit'),
('customer_service', 'bookings.view'),
('customer_service', 'bookings.create'),
('customer_service', 'bookings.edit'),
('customer_service', 'bookings.reschedule'),
('customer_service', 'sales.view');

-- =====================================================
-- SEED DATA - DEFAULT ADMIN USER
-- =====================================================

-- Create default admin user (password: 'admin123' - should be changed immediately)
INSERT INTO users (id, name, email, role_id, is_active, department, employee_id, created_by) VALUES
('admin-user-001', 'System Administrator', 'admin@salon.com', 'admin', true, 'Management', 'ADMIN001', 'system');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'RBAC database schema setup completed successfully!';
    RAISE NOTICE 'Created % permissions across % categories', 
        (SELECT COUNT(*) FROM permissions), 
        (SELECT COUNT(DISTINCT category) FROM permissions);
    RAISE NOTICE 'Created % roles with permission assignments', 
        (SELECT COUNT(*) FROM roles);
    RAISE NOTICE 'Default admin user created with email: admin@salon.com';
    RAISE NOTICE 'Please change the default admin password immediately!';
END $$;