import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/**
 * Supabase 클라이언트 (클라이언트 사이드용)
 * @description 브라우저에서 사용하는 Supabase 클라이언트
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

/**
 * Supabase 브라우저 클라이언트 생성
 * @description 클라이언트 사이드에서 사용하는 새 인스턴스 생성
 */
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  })
}

/**
 * Supabase 서버 클라이언트 생성
 * @description API 라우트에서 사용하는 서버용 클라이언트
 * @note Falls back to anon key if service role key is not set
 */
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const key = serviceRoleKey || supabaseAnonKey

  return createClient<Database>(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Supabase 클라이언트 생성 (세션 토큰 사용)
 * @description 사용자 세션을 가진 클라이언트 생성
 */
export function createClientWithToken(accessToken: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
