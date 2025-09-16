// lib/auth-simple.ts - Simplified auth utilities for development mode
import { auth } from '@clerk/nextjs/server'

/**
 * Simple auth check that works without database
 */
export async function getSimpleAuth() {
  try {
    const { userId } = auth()
    return {
      userId,
      isAuthenticated: !!userId,
    }
  } catch (error) {
    console.warn('Clerk auth not configured properly:', error)
    return {
      userId: null,
      isAuthenticated: false,
    }
  }
}

/**
 * Check if user is authenticated (simplified version)
 */
export async function isAuthenticated(): Promise<boolean> {
  const { isAuthenticated } = await getSimpleAuth()
  return isAuthenticated
}

/**
 * Get current user ID (simplified version)
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await getSimpleAuth()
  return userId
}