// lib/db-test.ts - Database connection test utility
import { neon } from '@neondatabase/serverless'

export async function testDatabaseConnection(): Promise<{ connected: boolean; error?: string; details?: any }> {
  try {
    console.log('[DB-TEST] Testing database connection...')
    
    if (!process.env.DATABASE_URL) {
      return { 
        connected: false, 
        error: 'DATABASE_URL environment variable is not set' 
      }
    }

    const sql = neon(process.env.DATABASE_URL)
    
    // Simple connectivity test
    const result = await sql`SELECT 1 as test`
    
    if (result && result.length > 0 && result[0].test === 1) {
      console.log('[DB-TEST] Database connection successful')
      return { connected: true, details: { testQuery: 'passed' } }
    } else {
      return { 
        connected: false, 
        error: 'Unexpected result from test query',
        details: result 
      }
    }
  } catch (error) {
    console.error('[DB-TEST] Database connection failed:', error)
    return { 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error 
    }
  }
}

export async function testTenantTableAccess(): Promise<{ accessible: boolean; error?: string; tenantCount?: number }> {
  try {
    console.log('[DB-TEST] Testing tenants table access...')
    
    const sql = neon(process.env.DATABASE_URL!)
    
    // Test if tenants table exists and is accessible
    const result = await sql`SELECT COUNT(*) as count FROM tenants`
    const tenantCount = Number(result[0]?.count) || 0
    
    console.log('[DB-TEST] Tenants table accessible, count:', tenantCount)
    return { accessible: true, tenantCount }
    
  } catch (error) {
    console.error('[DB-TEST] Tenants table access failed:', error)
    return { 
      accessible: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}