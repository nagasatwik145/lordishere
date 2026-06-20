import { createAuthClient } from 'better-auth/react'

// Initialize auth client with email/password only (no OAuth)
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : undefined,
  fetchOptions: {
    credentials: 'include',
  },
})

export const { signIn, signUp, signOut, useSession } = authClient

// Utility function to get current session
export async function getSession() {
  try {
    const response = await fetch('/api/auth/get-session', {
      credentials: 'include',
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

// Utility function to sign out
export async function signOutUser() {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
