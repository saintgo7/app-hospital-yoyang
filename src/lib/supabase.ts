/**
 * @deprecated This file is deprecated and no longer used.
 *
 * The project has migrated from Supabase to PostgreSQL with NextAuth.
 *
 * - Database queries: Use @/lib/db instead
 * - Authentication: Use NextAuth.js instead of Supabase Auth
 * - Real-time: Use polling instead of Supabase Realtime
 *
 * Migration date: 2026-02-03
 *
 * DO NOT USE THIS FILE IN NEW CODE.
 *
 * If you see imports from this file in existing code, they should be updated to use:
 * - `import { query, transaction } from '@/lib/db'` for database operations
 * - `import { getServerSession } from 'next-auth'` for authentication in API routes
 * - `import { useSession } from 'next-auth/react'` for authentication in client components
 */

// Keeping empty exports to prevent import errors during gradual migration
export const supabase = null as any
export const createBrowserClient = () => {
  throw new Error('Supabase client is deprecated. Use PostgreSQL with NextAuth instead.')
}
export const createServerClient = () => {
  throw new Error('Supabase client is deprecated. Use PostgreSQL with NextAuth instead.')
}
export const createClientWithToken = () => {
  throw new Error('Supabase client is deprecated. Use PostgreSQL with NextAuth instead.')
}
