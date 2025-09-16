// app/api/test-db/route.ts - Database connection test endpoint
import { NextResponse } from 'next/server'
import { testDatabaseConnection, testTenantTableAccess } from '@/lib/db-test'

export async function GET() {
  try {
    console.log('[API] Testing database connection...')
    
    // Test basic connectivity
    const connectionTest = await testDatabaseConnection()
    
    // Test tenant table access if connection works
    let tenantTest: any = { accessible: false, error: 'Connection failed' }
    if (connectionTest.connected) {
      tenantTest = await testTenantTableAccess()
    }
    
    const response = {
      timestamp: new Date().toISOString(),
      database: {
        url: process.env.DATABASE_URL ? 'Set' : 'Not Set',
        connection: connectionTest,
        tenantTable: tenantTest
      },
      recommendation: getRecommendation(connectionTest, tenantTest)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('[API] Database test failed:', error)
    return NextResponse.json(
      { 
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function getRecommendation(connectionTest: any, tenantTest: any): string {
  if (!connectionTest.connected) {
    if (connectionTest.error?.includes('fetch failed') || connectionTest.error?.includes('ECONNREFUSED')) {
      return 'Database connection failed. Check if Neon database is running and accessible. Verify DATABASE_URL is correct.'
    }
    return 'Database connection issue. Check DATABASE_URL and network connectivity.'
  }
  
  if (!tenantTest.accessible) {
    return 'Database connected but tenants table is not accessible. Run database migrations.'
  }
  
  if (tenantTest.tenantCount === 0) {
    return 'Database and table accessible but no tenants exist. This is the likely cause of the tenant resolution error.'
  }
  
  return 'Database appears to be working correctly.'
}