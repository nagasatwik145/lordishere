import { betterAuth } from 'better-auth'
import { pool } from '@/lib/db'

const baseURL = process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:${process.env.PORT || 3000}`)

export const auth = betterAuth({
  database: pool,
  baseURL: baseURL,
  // Email and password only - no OAuth
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
  },
  // Disable all OAuth providers
  socialProviders: {
    google: {
      enabled: false,
    },
    github: {
      enabled: false,
    },
  },
  trustedOrigins: [
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
      : []),
    'http://localhost:3000',
    typeof window !== 'undefined' ? window.location.origin : '',
  ].filter(Boolean),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieOptions: {
      sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'strict',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
  },
})
