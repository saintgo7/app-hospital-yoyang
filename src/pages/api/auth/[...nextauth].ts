import NextAuth, { type NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import NaverProvider from 'next-auth/providers/naver'
import { query } from '@/lib/db'

// Build providers array only if credentials are configured
const providers = []

if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    })
  )
}

if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  providers.push(
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/auth/complete-profile',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      // 사용자 존재 여부 확인 (PostgreSQL 직접 쿼리)
      const result = await query<{ id: string; role: string }>(
        'SELECT id, role FROM users WHERE email = $1',
        [user.email]
      )

      if (result.rows.length === 0) {
        // 신규 사용자 - 프로필 완성 페이지로 리다이렉트
        return true
      }

      return true
    },
    async jwt({ token, user, account }) {
      // 초기 로그인 시 user 정보를 token에 저장
      if (user && user.email) {
        const result = await query<{
          id: string
          role: string
          phone: string | null
          name: string
        }>(
          'SELECT id, role, phone, name FROM users WHERE email = $1',
          [user.email]
        )

        if (result.rows.length > 0) {
          const dbUser = result.rows[0]
          token.id = dbUser.id
          token.role = dbUser.role as 'caregiver' | 'guardian'
          token.phone = dbUser.phone || undefined
          token.name = dbUser.name
          token.isProfileComplete = !!(dbUser.role && dbUser.phone)
        } else {
          token.isProfileComplete = false
        }
      }
      return token
    },
    async session({ session, token }) {
      // JWT 토큰의 정보를 세션에 추가
      if (session.user && token.id) {
        const role = token.role as string
        session.user.id = token.id as string
        session.user.role = (role === 'caregiver' || role === 'guardian' ? role : 'guardian') as 'caregiver' | 'guardian'
        session.user.phone = token.phone ? (token.phone as string) : undefined
        session.user.name = token.name as string
        session.user.isProfileComplete = token.isProfileComplete as boolean
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // 프로필 미완성 시 프로필 완성 페이지로
      if (url.includes('/auth/complete-profile')) {
        return url
      }
      // 기본 리다이렉트
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) return url
      return baseUrl
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  secret: process.env.NEXTAUTH_SECRET || 'temporary-secret-for-development',
}

export default NextAuth(authOptions)
