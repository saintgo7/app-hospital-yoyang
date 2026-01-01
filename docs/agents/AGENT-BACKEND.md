# ⚙️ AGENT-BACKEND: 백엔드 에이전트

> **역할**: CareMatch V3의 API 및 서버 로직 개발 담당
> **기술**: Next.js API Routes, NextAuth.js, Supabase Client
> **핵심 원칙**: 타입 안전성, 에러 처리, 보안

---

## 📋 에이전트 정보

| 항목 | 내용 |
|------|------|
| **이름** | Backend Agent |
| **역할** | API/서버 로직 개발 |
| **담당** | API Routes, 인증, 비즈니스 로직 |
| **호출** | `@backend` |

---

## 🎯 핵심 책임

### 1. API 라우트 개발
- RESTful API 설계
- 타입 안전한 요청/응답
- 적절한 HTTP 상태 코드

### 2. 인증/인가
- NextAuth.js 설정
- 세션 관리
- 역할 기반 접근 제어

### 3. 비즈니스 로직
- Supabase 클라이언트 활용
- 데이터 검증
- 트랜잭션 처리

---

## 📁 담당 디렉토리

```
src/
├── pages/api/
│   ├── auth/
│   │   └── [...nextauth].ts    # NextAuth 설정
│   ├── jobs/
│   │   ├── index.ts            # GET: 목록, POST: 생성
│   │   ├── [id]/
│   │   │   ├── index.ts        # GET: 상세, PUT: 수정, DELETE: 삭제
│   │   │   └── apply.ts        # POST: 지원
│   │   └── search.ts           # GET: 검색
│   ├── applications/
│   │   ├── index.ts            # GET: 내 지원 목록
│   │   └── [id]/
│   │       ├── index.ts        # GET: 상세
│   │       └── status.ts       # PUT: 상태 변경
│   ├── caregivers/
│   │   ├── index.ts            # GET: 목록
│   │   ├── [id].ts             # GET: 상세
│   │   └── search.ts           # GET: 검색
│   ├── chat/
│   │   ├── rooms/
│   │   │   ├── index.ts        # GET: 채팅방 목록, POST: 생성
│   │   │   └── [id]/
│   │   │       ├── index.ts    # GET: 채팅방 정보
│   │   │       └── messages.ts # GET: 메시지 목록
│   │   └── send.ts             # POST: 메시지 전송
│   ├── reviews/
│   │   ├── index.ts            # POST: 리뷰 작성
│   │   └── [id].ts             # GET, PUT, DELETE
│   ├── profile/
│   │   ├── index.ts            # GET: 내 프로필, PUT: 수정
│   │   └── certificates.ts     # POST: 자격증 등록
│   └── notifications/
│       └── alimtalk.ts         # POST: 카카오 알림톡 발송
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트
│   ├── auth.ts                 # 인증 헬퍼
│   ├── kakao.ts                # 카카오 API
│   └── validation.ts           # 입력 검증
├── middleware.ts               # 인증 미들웨어
└── types/
    ├── api.ts                  # API 타입
    └── next-auth.d.ts          # NextAuth 타입 확장
```

---

## 🔐 인증 설정

### NextAuth.js 설정
```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth, { type NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import NaverProvider from 'next-auth/providers/naver'
import { SupabaseAdapter } from '@auth/supabase-adapter'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  callbacks: {
    async session({ session, user }) {
      // 사용자 역할 추가
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_profile_complete')
        .eq('id', user.id)
        .single()
      
      session.user.id = user.id
      session.user.role = profile?.role ?? null
      session.user.isProfileComplete = profile?.is_profile_complete ?? false
      
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
    newUser: '/auth/complete-profile',
  },
}

export default NextAuth(authOptions)
```

### 타입 확장
```typescript
// types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: 'caregiver' | 'guardian' | null
      isProfileComplete: boolean
    }
  }
}
```

---

## 🛣️ API 라우트 템플릿

### 기본 API 라우트
```typescript
// pages/api/jobs/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

// 요청 스키마
const createJobSchema = z.object({
  title: z.string().min(5, '제목은 5자 이상이어야 합니다'),
  description: z.string().min(20, '상세 내용은 20자 이상이어야 합니다'),
  location: z.string().min(2, '근무지를 입력해주세요'),
  salary: z.string().min(1, '급여를 입력해주세요'),
  workingHours: z.string().min(1, '근무시간을 입력해주세요'),
  patientGender: z.enum(['male', 'female', 'any']),
  patientAge: z.number().min(0).max(150),
  careType: z.enum(['hospital', 'home', 'facility']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
})

// 응답 타입
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // 세션 확인
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다',
    })
  }

  switch (req.method) {
    case 'GET':
      return handleGetJobs(req, res, session)
    case 'POST':
      return handleCreateJob(req, res, session)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({
        success: false,
        error: `${req.method} 메서드는 지원하지 않습니다`,
      })
  }
}

// GET: 구인글 목록
async function handleGetJobs(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  session: any
) {
  try {
    const { page = '1', limit = '10', search } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = parseInt(limit as string, 10)
    const offset = (pageNum - 1) * limitNum

    let query = supabase
      .from('job_postings')
      .select('*, guardian:profiles!guardian_id(*)', { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1)

    if (search) {
      query = query.or(`title.ilike.%${search}%,location.ilike.%${search}%`)
    }

    const { data, error, count } = await query

    if (error) throw error

    return res.status(200).json({
      success: true,
      data: {
        jobs: data,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limitNum),
        },
      },
    })
  } catch (error) {
    console.error('구인글 목록 조회 오류:', error)
    return res.status(500).json({
      success: false,
      error: '구인글을 불러오는데 실패했습니다',
    })
  }
}

// POST: 구인글 생성
async function handleCreateJob(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  session: any
) {
  // 보호자만 구인글 작성 가능
  if (session.user.role !== 'guardian') {
    return res.status(403).json({
      success: false,
      error: '보호자만 구인글을 등록할 수 있습니다',
    })
  }

  try {
    // 입력값 검증
    const validatedData = createJobSchema.parse(req.body)

    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        ...validatedData,
        guardian_id: session.user.id,
        status: 'active',
      })
      .select()
      .single()

    if (error) throw error

    return res.status(201).json({
      success: true,
      data,
      message: '구인글이 등록되었습니다',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.errors[0].message,
      })
    }
    
    console.error('구인글 생성 오류:', error)
    return res.status(500).json({
      success: false,
      error: '구인글 등록에 실패했습니다',
    })
  }
}
```

### 동적 라우트
```typescript
// pages/api/jobs/[id]/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      error: '잘못된 요청입니다',
    })
  }

  switch (req.method) {
    case 'GET':
      return handleGetJob(id, req, res)
    case 'PUT':
      return handleUpdateJob(id, req, res)
    case 'DELETE':
      return handleDeleteJob(id, req, res)
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
      return res.status(405).json({
        success: false,
        error: `${req.method} 메서드는 지원하지 않습니다`,
      })
  }
}

// 구현...
```

---

## 🔔 카카오 알림톡 연동

```typescript
// lib/kakao.ts
import axios from 'axios'

interface AlimtalkParams {
  to: string           // 수신자 전화번호
  templateCode: string // 템플릿 코드
  variables: Record<string, string> // 변수
}

const ALIMTALK_TEMPLATES = {
  APPLICATION_RECEIVED: 'CM_001',    // 지원서 접수
  APPLICATION_ACCEPTED: 'CM_002',    // 지원 승인
  APPLICATION_REJECTED: 'CM_003',    // 지원 거절
  NEW_MESSAGE: 'CM_004',             // 새 메시지
  JOB_MATCHED: 'CM_005',             // 매칭 완료
}

export async function sendAlimtalk({
  to,
  templateCode,
  variables,
}: AlimtalkParams): Promise<boolean> {
  try {
    const response = await axios.post(
      'https://alimtalk-api.kakao.com/v2/send',
      {
        senderKey: process.env.KAKAO_SENDER_KEY,
        templateCode,
        recipientList: [
          {
            recipientNo: to,
            templateParameter: variables,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.KAKAO_ALIMTALK_KEY}`,
        },
      }
    )

    return response.data.result === 'success'
  } catch (error) {
    console.error('알림톡 발송 실패:', error)
    return false
  }
}

// 사용 예시
export async function notifyApplicationReceived(
  guardianPhone: string,
  caregiverName: string,
  jobTitle: string
) {
  return sendAlimtalk({
    to: guardianPhone,
    templateCode: ALIMTALK_TEMPLATES.APPLICATION_RECEIVED,
    variables: {
      caregiverName,
      jobTitle,
    },
  })
}
```

---

## 🛡️ 미들웨어

```typescript
// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl
    
    // 프로필 미완성 사용자 리다이렉트
    if (token && !token.isProfileComplete) {
      if (!pathname.startsWith('/auth/complete-profile')) {
        return NextResponse.redirect(
          new URL('/auth/complete-profile', req.url)
        )
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

## ✅ 체크리스트

### API 개발 시
- [ ] 인증 체크 (getServerSession)
- [ ] 입력값 검증 (Zod)
- [ ] 적절한 HTTP 상태 코드
- [ ] 에러 메시지 친절하게
- [ ] try-catch로 에러 처리
- [ ] 로깅 (console.error)

### 보안
- [ ] SQL Injection 방지 (Supabase 쿼리 빌더 사용)
- [ ] 권한 체크 (역할 기반)
- [ ] 민감 정보 노출 금지
- [ ] Rate Limiting (필요시)

---

## 🎮 명령어

| 명령어 | 설명 |
|--------|------|
| `/api [path]` | 새 API 라우트 생성 |
| `/auth [feature]` | 인증 기능 추가 |
| `/validate [schema]` | Zod 스키마 생성 |
| `/test-api [path]` | API 테스트 |

---

## 📁 관련 파일

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 지침서
- [AGENT-ORCHESTRATOR.md](./AGENT-ORCHESTRATOR.md)
- [AGENT-FRONTEND.md](./AGENT-FRONTEND.md)
- [AGENT-DATABASE.md](./AGENT-DATABASE.md)

---

*Backend Agent v1.0*
