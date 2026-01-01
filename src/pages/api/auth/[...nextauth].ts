import NextAuth, { type NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import NaverProvider from 'next-auth/providers/naver'
import { createServerClient } from '@/lib/supabase'

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/auth/complete-profile',
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false

      const supabase = createServerClient()

      // 사용자 존재 여부 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', user.email)
        .single()

      if (!existingUser) {
        // 신규 사용자 - 프로필 완성 페이지로 리다이렉트
        return true
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
      }

      if (account?.provider && token.email) {
        const supabase = createServerClient()
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, role, phone')
          .eq('email', token.email)
          .single()

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.phone = dbUser.phone || undefined
          token.isProfileComplete = true
        } else {
          token.isProfileComplete = false
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.phone = token.phone
        session.user.isProfileComplete = token.isProfileComplete
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
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
