import { createAPIFileRoute } from '@tanstack/react-start/api'
import { auth } from '@/lib/auth'

/**
 * Better Auth API handler - routes all auth requests
 * Supports: signin, signup, signout, session management
 */
export const APIRoute = createAPIFileRoute('/api/auth')({
  GET: async ({ request }) => {
    // Handle GET requests (session check, callback, etc.)
    return auth.handler(request)
  },
  POST: async ({ request }) => {
    // Handle POST requests (login, signup, etc.)
    return auth.handler(request)
  },
})

/**
 * Get current session - helper endpoint
 */
export async function getSessionHandler(request: Request) {
  // This is called via the auth-client when checking session
  const response = await auth.handler(request)
  return response
}
