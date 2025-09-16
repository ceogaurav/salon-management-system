// lib/fallback-auth.ts - Fallback authentication for development mode
import { auth } from '@clerk/nextjs/server'

/**
 * Simple fallback authentication that works without database
 * This provides basic tenant context when the database is not accessible
 */
export async function withFallbackTenantAuth<T>(
  handler: (context: { tenantId: string; userId: string }) => Promise<T>
): Promise<T> {
  try {
    const { userId, orgId } = auth()
    
    if (!userId) {
      throw new Error('Unauthorized - no user ID')
    }
    
    // Use organization ID as tenant ID, or create a fallback
    const tenantId = orgId || createFallbackTenantId(userId)
    
    console.log('[FALLBACK-AUTH] Using fallback tenant context:', { userId, tenantId })
    
    return await handler({ tenantId, userId })
  } catch (error) {
    console.error('[FALLBACK-AUTH] Error:', error)
    throw error
  }
}

/**
 * Create a consistent fallback tenant ID based on user ID
 */
function createFallbackTenantId(userId: string): string {
  // Create a simple hash of the user ID for consistent tenant ID
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString()
}

/**
 * Get fallback business settings without database
 */
export function getFallbackBusinessSettings() {
  return {
    profile: {
      salonName: "Your Salon",
      ownerName: "Salon Owner",
      email: "owner@salon.com",
      phone: "+1234567890",
      address: "123 Main Street, City, State 12345",
      website: "www.yoursalon.com",
      description: "Premium salon services",
      logo: "",
      coverImage: "",
      socialMedia: {
        facebook: "",
        instagram: "",
        twitter: "",
        whatsapp: "",
      },
    },
    business: {
      openTime: "09:00",
      closeTime: "18:00",
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      appointmentDuration: 30,
      advanceBookingDays: 30,
      cancellationPolicy: "24 hours advance notice required",
      taxRate: 10,
      serviceCharge: 0,
      currency: "USD",
      timezone: "America/New_York",
      language: "English",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12-hour",
    },
    // Add other required sections as needed...
  }
}