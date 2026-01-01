# 🔐 Phase 2: 인증 시스템 (Day 3-5)

> **목표**: 소셜 로그인 및 사용자 인증 구현
> **예상 소요**: 3일
> **담당**: @backend, @frontend, @database

---

## 📋 체크리스트

- [ ] 2.1 NextAuth.js 설정
- [ ] 2.2 Kakao 소셜 로그인
- [ ] 2.3 Naver 소셜 로그인
- [ ] 2.4 프로필 완성 페이지
- [ ] 2.5 인증 미들웨어
- [ ] 2.6 로그인/회원가입 UI

---

## 2.1 NextAuth.js 설정

```typescript
// src/pages/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import NaverProvider from 'next-auth/providers/naver'
import { supabaseAdmin } from '@/lib/supabase'

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
  
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false
      
      // Supabase에 사용자 저장/업데이트
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', user.email)
        .single()
      
      if (!existingUser) {
        // 새 사용자 생성
        await supabaseAdmin.from('profiles').insert({
          email: user.email,
          name: user.name,
          profile_image: user.image,
          provider: account?.provider,
          provider_id: account?.providerAccountId,
        })
      }
      
      return true
    },
    
    async session({ session, token }) {
      if (session.user?.email) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, role, is_profile_complete')
          .eq('email', session.user.email)
          .single()
        
        if (profile) {
          session.user.id = profile.id
          session.user.role = profile.role
          session.user.isProfileComplete = profile.is_profile_complete
        }
      }
      return session
    },
    
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/auth/complete-profile',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
}

export default NextAuth(authOptions)
```

---

## 2.2 Kakao 소셜 로그인 설정

### Kakao Developers 설정

1. [Kakao Developers](https://developers.kakao.com) 접속
2. 애플리케이션 추가
3. **플랫폼** > Web 플랫폼 등록
   - 사이트 도메인: `http://localhost:3000`
4. **카카오 로그인** 활성화
5. **동의항목** 설정:
   - 닉네임: 필수
   - 프로필 사진: 선택
   - 이메일: 필수
6. **Redirect URI** 설정:
   - `http://localhost:3000/api/auth/callback/kakao`

---

## 2.3 Naver 소셜 로그인 설정

### Naver Developers 설정

1. [Naver Developers](https://developers.naver.com) 접속
2. 애플리케이션 등록
3. **사용 API**: 네이버 로그인
4. **환경**: PC 웹
5. **서비스 URL**: `http://localhost:3000`
6. **Callback URL**: `http://localhost:3000/api/auth/callback/naver`

---

## 2.4 프로필 완성 페이지

```typescript
// src/pages/auth/complete-profile.tsx
import { type NextPage } from 'next'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const profileSchema = z.object({
  role: z.enum(['caregiver', 'guardian'], {
    required_error: '역할을 선택해주세요',
  }),
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  phone: z.string().regex(/^01[0-9]-?[0-9]{4}-?[0-9]{4}$/, '올바른 전화번호를 입력해주세요'),
})

type ProfileFormData = z.infer<typeof profileSchema>

const CompleteProfilePage: NextPage = () => {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name ?? '',
    },
  })
  
  const selectedRole = watch('role')
  
  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        await update()
        router.push(`/${data.role}`)
      }
    } catch (error) {
      console.error('프로필 저장 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Head>
        <title>프로필 완성 | CareMatch</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              프로필을 완성해주세요
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* 역할 선택 */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  어떻게 사용하시겠어요?
                </Label>
                <RadioGroup
                  value={selectedRole}
                  onValueChange={(value) => setValue('role', value as 'caregiver' | 'guardian')}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="caregiver"
                    className={`
                      flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer
                      ${selectedRole === 'caregiver' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}
                    `}
                  >
                    <RadioGroupItem value="caregiver" id="caregiver" className="sr-only" />
                    <span className="text-4xl mb-2">👨‍⚕️</span>
                    <span className="text-lg font-medium">간병인</span>
                    <span className="text-sm text-gray-500">일자리를 찾고 있어요</span>
                  </Label>
                  
                  <Label
                    htmlFor="guardian"
                    className={`
                      flex flex-col items-center p-6 border-2 rounded-lg cursor-pointer
                      ${selectedRole === 'guardian' ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}
                    `}
                  >
                    <RadioGroupItem value="guardian" id="guardian" className="sr-only" />
                    <span className="text-4xl mb-2">👨‍👩‍👧</span>
                    <span className="text-lg font-medium">보호자</span>
                    <span className="text-sm text-gray-500">간병인을 찾고 있어요</span>
                  </Label>
                </RadioGroup>
                {errors.role && (
                  <p className="text-red-600 text-base">{errors.role.message}</p>
                )}
              </div>
              
              {/* 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-lg">이름</Label>
                <Input
                  id="name"
                  {...register('name')}
                  className="text-lg h-14"
                  placeholder="이름을 입력해주세요"
                />
                {errors.name && (
                  <p className="text-red-600 text-base">{errors.name.message}</p>
                )}
              </div>
              
              {/* 전화번호 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-lg">전화번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  className="text-lg h-14"
                  placeholder="010-1234-5678"
                />
                {errors.phone && (
                  <p className="text-red-600 text-base">{errors.phone.message}</p>
                )}
              </div>
              
              <Button
                type="submit"
                className="w-full h-14 text-xl"
                disabled={isLoading}
              >
                {isLoading ? '저장 중...' : '시작하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default CompleteProfilePage
```

---

## 2.5 인증 미들웨어

```typescript
// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl
    
    // 프로필 미완성 사용자 리다이렉트
    if (token && !token.isProfileComplete) {
      if (!pathname.startsWith('/auth/complete-profile')) {
        return NextResponse.redirect(new URL('/auth/complete-profile', req.url))
      }
    }
    
    // 역할별 접근 제어
    if (pathname.startsWith('/caregiver') && token?.role !== 'caregiver') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    if (pathname.startsWith('/guardian') && token?.role !== 'guardian') {
      return NextResponse.redirect(new URL('/', req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/caregiver/:path*',
    '/guardian/:path*',
    '/chat/:path*',
    '/profile/:path*',
  ],
}
```

---

## 2.6 로그인/회원가입 UI

```typescript
// src/pages/auth/login.tsx
import { type NextPage, type GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { signIn } from 'next-auth/react'
import Head from 'next/head'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authOptions } from '../api/auth/[...nextauth]'

const LoginPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>로그인 | CareMatch</title>
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="text-4xl font-bold text-primary-600 mb-2">
              CareMatch
            </div>
            <CardTitle className="text-xl text-gray-600">
              간편하게 로그인하세요
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* 카카오 로그인 */}
            <Button
              onClick={() => signIn('kakao')}
              className="w-full h-14 text-lg bg-[#FEE500] hover:bg-[#FDD835] text-black"
            >
              <Image
                src="/images/kakao-logo.svg"
                alt=""
                width={24}
                height={24}
                className="mr-3"
              />
              카카오로 시작하기
            </Button>
            
            {/* 네이버 로그인 */}
            <Button
              onClick={() => signIn('naver')}
              className="w-full h-14 text-lg bg-[#03C75A] hover:bg-[#02B351] text-white"
            >
              <Image
                src="/images/naver-logo.svg"
                alt=""
                width={24}
                height={24}
                className="mr-3"
              />
              네이버로 시작하기
            </Button>
            
            <p className="text-center text-gray-500 text-base pt-4">
              로그인 시 <span className="underline">이용약관</span> 및{' '}
              <span className="underline">개인정보처리방침</span>에 동의합니다
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (session) {
    return {
      redirect: {
        destination: session.user.role ? `/${session.user.role}` : '/auth/complete-profile',
        permanent: false,
      },
    }
  }
  
  return { props: {} }
}

export default LoginPage
```

---

## ✅ 완료 확인

Phase 2 완료 시 다음이 가능해야 합니다:

1. 카카오 로그인 정상 작동
2. 네이버 로그인 정상 작동
3. 신규 사용자 프로필 완성 플로우
4. 역할별 리다이렉트 작동

---

## ➡️ 다음 단계

Phase 3로 진행: [PHASE-3-CORE.md](./PHASE-3-CORE.md)

---

*Phase 2 v1.0*
