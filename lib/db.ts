// lib/db.ts
import { neon } from "@neondatabase/serverless"

// Lazy initialization to avoid build-time database access
let baseSql: any = null

function getBaseSql() {
  if (!baseSql) {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL environment variable not set - using fallback mode")
      return createGlobalFallbackSql()
    }
    baseSql = neon(process.env.DATABASE_URL)
  }
  return baseSql
}

/**
 * Global fallback SQL client for when DATABASE_URL is not available
 */
function createGlobalFallbackSql() {
  return async (query: any, ...params: any[]) => {
    console.warn("[DB] No DATABASE_URL available - using fallback mode")
    console.warn("[DB] Query attempted:", typeof query === 'string' ? query : 'Template query')
    
    // Return empty results for most queries to prevent crashes
    return []
  }
}

/**
 * Get the internal tenant ID from a tenant key (Clerk orgId or orgSlug)
 * Auto-creates tenant if it doesn't exist, with robust error handling
 */
export async function getInternalTenantId(tenantKey: string): Promise<string> {
  try {
    console.log("[DB] Looking up tenant for key:", tenantKey)
    
    // Test basic connectivity first
    await testConnection()
    
    const sql = getBaseSql()
    
    // Try to find by tenant name that matches the key (simple approach)
    const existingTenant = await sql`
      SELECT id, name FROM tenants 
      WHERE name = ${tenantKey} OR name LIKE ${`%${tenantKey}%`}
      LIMIT 1
    `
    
    if (existingTenant.length > 0) {
      console.log("[DB] Found existing tenant:", existingTenant[0].id, "name:", existingTenant[0].name)
      return existingTenant[0].id.toString();
    }
    
    // If tenant doesn't exist, create it automatically
    console.log("[DB] Tenant not found, creating new tenant for key:", tenantKey)
    const newTenant = await createTenantForKey(tenantKey)
    console.log("[DB] Created new tenant with ID:", newTenant.id)
    return newTenant.id
    
  } catch (error) {
    console.error("[DB] Error fetching/creating internal tenant ID:", error)
    
    // If it's a connection error, provide a temporary fallback
    if (error instanceof Error && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
      console.warn("[DB] Database connection failed, using fallback tenant ID")
      return handleConnectionFailure(tenantKey)
    }
    
    // For any other database error, also use fallback instead of crashing
    console.warn("[DB] Database error encountered, using fallback tenant ID for:", tenantKey)
    return handleConnectionFailure(tenantKey)
  }
}

/**
 * Test database connection
 */
async function testConnection(): Promise<void> {
  try {
    const sql = getBaseSql()
    await sql`SELECT 1 as test`
  } catch (error) {
    console.error('[DB] Connection test failed:', error)
    throw error
  }
}

/**
 * Handle connection failure with fallback mechanism
 */
function handleConnectionFailure(tenantKey: string): string {
  console.log('[DB] Implementing fallback for tenant:', tenantKey)
  
  // Create a deterministic ID based on the tenant key
  // This ensures the same tenant key always gets the same ID
  const fallbackId = Math.abs(hashCode(tenantKey)).toString()
  
  console.log('[DB] Using fallback tenant ID:', fallbackId)
  return fallbackId
}

/**
 * Simple hash function for consistent fallback IDs
 */
function hashCode(str: string): number {
  let hash = 0
  if (str.length === 0) return hash
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash
}

/**
 * Create a new tenant for the given tenant key
 */
async function createTenantForKey(tenantKey: string): Promise<{ id: string }> {
  try {
    console.log("[DB] Creating new tenant for key:", tenantKey)
    
    const sql = getBaseSql()
    
    // Use the tenant key as the salon name for now
    const salonName = tenantKey.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    const result = await sql`
      INSERT INTO tenants (name, created_at)
      VALUES (${salonName}, NOW())
      RETURNING id
    `
    
    if (result.length === 0) {
      throw new Error('Failed to create tenant')
    }
    
    const tenantId = result[0].id.toString()
    console.log("[DB] Successfully created tenant ID:", tenantId, "for key:", tenantKey)
    
    return { id: tenantId }
  } catch (error) {
    console.error("[DB] Error creating tenant for key:", tenantKey, error)
    throw error
  }
}

/**
 * Create a SQL client with tenant context set via connection string
 * Includes fallback for connection failures
 */
export function getTenantSql(tenantId: string) {
  try {
    const originalUrl = process.env.DATABASE_URL!;
    
    // Add the tenant ID as a connection option
    const url = new URL(originalUrl);
    url.searchParams.set('options', `-c app.current_tenant=${tenantId}`);
    
    console.log("[DB] Creating SQL client for tenant:", tenantId);
    return neon(url.toString());
  } catch (error) {
    console.error('[DB] Error creating tenant SQL client:', error)
    // Return a fallback client that will handle errors gracefully
    return createFallbackSqlClient(tenantId)
  }
}

/**
 * Create a fallback SQL client for when database is not accessible
 */
function createFallbackSqlClient(tenantId: string) {
  return async (query: any, ...params: any[]) => {
    console.warn(`[DB] Fallback SQL client called for tenant ${tenantId}. Database not accessible.`)
    console.warn(`[DB] Query attempted:`, typeof query === 'string' ? query : 'Template query')
    
    // Return empty results for most queries to prevent crashes
    return []
  }
}

/**
 * Get an authenticated SQL client with tenant context
 */
export async function getAuthenticatedSql(tenantKey: string) {
  console.log("[DB] Resolving tenant context for:", tenantKey)
  
  const tenantId = await getInternalTenantId(tenantKey)
  console.log("[DB] Using internal tenant ID:", tenantId)
  
  const tenantSql = getTenantSql(tenantId);
  return { 
    sql: tenantSql, 
    tenantId, 
    tenantKey 
  };
}

// Export the base SQL client for non-tenant-specific operations
export function sql() {
  return getBaseSql()
}
