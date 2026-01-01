# TRD (Technical Requirements Document)
# CareMatch V3 - 기술 요구사항 정의서

---

## 1. 시스템 아키텍처

### 1.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js 14 (Pages Router)                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Pages   │ │Components│ │ Hooks   │ │ Stores  │       │   │
│  │  │ Router  │ │ shadcn  │ │ Custom  │ │ Zustand │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          API Layer                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Next.js API Routes (/pages/api)             │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │NextAuth │ │  Jobs   │ │  Chat   │ │ Review  │       │   │
│  │  │[...next │ │  API    │ │  API    │ │  API    │       │   │
│  │  │ auth]   │ │         │ │         │ │         │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Services                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      Supabase                             │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │  │
│  │  │PostgreSQL│ │  Auth  │ │Storage │ │Realtime│ │Edge Fn │ │  │
│  │  │   DB    │ │        │ │        │ │        │ │        │ │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐              │
│  │ Kakao   │ │ Naver   │ │ Kakao   │ │ Vercel  │              │
│  │ OAuth   │ │ OAuth   │ │Alimtalk │ │ Hosting │              │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택 상세

#### Frontend
```json
{
  "framework": "next@14.2.35",
  "router": "pages",
  "language": "typescript@5.x",
  "styling": {
    "tailwindcss": "3.4.x",
    "shadcn/ui": "latest"
  },
  "state": {
    "global": "zustand@4.x",
    "server": "@tanstack/react-query@5.x"
  },
  "form": {
    "react-hook-form": "7.x",
    "zod": "3.x"
  },
  "utilities": {
    "date-fns": "3.x",
    "lucide-react": "latest",
    "clsx": "2.x",
    "tailwind-merge": "2.x"
  }
}
```

#### Backend
```json
{
  "runtime": "next.js api routes (serverless)",
  "auth": "next-auth@4.x",
  "database": "supabase (postgresql 15)",
  "storage": "supabase storage",
  "realtime": "supabase realtime"
}
```

---

## 2. 데이터베이스 설계

### 2.1 ERD (Entity Relationship Diagram)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   users     │       │  caregivers │       │certificates │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │───┐   │ id (PK)     │───┬───│ id (PK)     │
│ email       │   │   │ user_id(FK) │   │   │caregiver_id │
│ name        │   │   │ gender      │   │   │ cert_type   │
│ user_type   │   │   │ career_years│   │   │ cert_number │
│ auth_provider│  │   │ rating      │   │   │ status      │
└─────────────┘   │   └─────────────┘   │   └─────────────┘
                  │                     │
                  │   ┌─────────────┐   │   ┌─────────────┐
                  │   │  guardians  │   │   │  patients   │
                  │   ├─────────────┤   │   ├─────────────┤
                  └───│ id (PK)     │───│   │ id (PK)     │
                      │ user_id(FK) │   │   │guardian_id  │
                      │guardian_type│   │   │ gender      │
                      │facility_name│   │   │ diagnosis   │
                      └─────────────┘   │   └─────────────┘
                            │           │          │
                            │           │          │
                      ┌─────────────┐   │   ┌──────▼──────┐
                      │ job_postings│───┼───│applications │
                      ├─────────────┤   │   ├─────────────┤
                      │ id (PK)     │   │   │ id (PK)     │
                      │guardian_id  │   │   │job_posting_id│
                      │patient_id   │   │   │caregiver_id │
                      │ title       │   │   │ status      │
                      │ status      │   │   └─────────────┘
                      └─────────────┘   │
                            │           │
                      ┌─────▼─────┐     │   ┌─────────────┐
                      │  matches  │─────┴───│  reviews    │
                      ├───────────┤         ├─────────────┤
                      │ id (PK)   │─────────│ id (PK)     │
                      │caregiver_id│        │ match_id    │
                      │guardian_id│         │ rating      │
                      │ status    │         │ content     │
                      └───────────┘         └─────────────┘
                            │
                      ┌─────▼─────┐         ┌─────────────┐
                      │chat_rooms │─────────│  messages   │
                      ├───────────┤         ├─────────────┤
                      │ id (PK)   │─────────│ id (PK)     │
                      │caregiver_id│        │chat_room_id │
                      │guardian_id│         │ sender_id   │
                      │last_message│        │ content     │
                      └───────────┘         └─────────────┘
```

### 2.2 테이블 스키마

#### users (사용자)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PK, DEFAULT gen_random_uuid() | 고유 ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 |
| phone | VARCHAR(20) | | 전화번호 |
| name | VARCHAR(100) | NOT NULL | 이름 |
| profile_image | VARCHAR(500) | | 프로필 이미지 URL |
| user_type | VARCHAR(20) | NOT NULL | caregiver/guardian/admin |
| auth_provider | VARCHAR(20) | | kakao/naver/email |
| is_verified | BOOLEAN | DEFAULT FALSE | 인증 여부 |
| is_active | BOOLEAN | DEFAULT TRUE | 활성 상태 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | 수정일 |

#### caregivers (간병인)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PK | 고유 ID |
| user_id | UUID | FK → users.id, UNIQUE | 사용자 ID |
| gender | VARCHAR(10) | CHECK (male/female) | 성별 |
| birth_date | DATE | | 생년월일 |
| address_sido | VARCHAR(50) | | 시/도 |
| address_sigungu | VARCHAR(50) | | 시/군/구 |
| career_years | INTEGER | DEFAULT 0 | 경력 년수 |
| introduction | TEXT | | 자기소개 |
| preferred_work_type | VARCHAR[] | DEFAULT '{}' | 희망 근무형태 |
| preferred_regions | VARCHAR[] | DEFAULT '{}' | 희망 지역 |
| preferred_salary_type | VARCHAR(20) | | hourly/daily/monthly |
| preferred_salary_min | INTEGER | | 최소 희망급여 |
| preferred_salary_max | INTEGER | | 최대 희망급여 |
| is_verified | BOOLEAN | DEFAULT FALSE | 인증 여부 |
| rating | DECIMAL(2,1) | DEFAULT 0 | 평점 |
| review_count | INTEGER | DEFAULT 0 | 리뷰 수 |

#### guardians (보호자/시설)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PK | 고유 ID |
| user_id | UUID | FK → users.id, UNIQUE | 사용자 ID |
| guardian_type | VARCHAR(20) | CHECK (individual/facility) | 보호자 유형 |
| facility_name | VARCHAR(200) | | 시설명 |
| facility_type | VARCHAR(50) | | 시설 유형 |
| business_number | VARCHAR(20) | | 사업자번호 |
| address_sido | VARCHAR(50) | | 시/도 |
| address_sigungu | VARCHAR(50) | | 시/군/구 |
| contact_phone | VARCHAR(20) | | 연락처 |

#### job_postings (구인공고)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| id | UUID | PK | 고유 ID |
| guardian_id | UUID | FK → guardians.id | 보호자 ID |
| patient_id | UUID | FK → patients.id | 환자 ID |
| title | VARCHAR(200) | NOT NULL | 제목 |
| work_type | VARCHAR(50) | NOT NULL | 입주/출퇴근/시간제 |
| work_location_sido | VARCHAR(50) | NOT NULL | 근무지 시/도 |
| work_location_sigungu | VARCHAR(50) | NOT NULL | 근무지 시/군/구 |
| work_start_date | DATE | NOT NULL | 근무 시작일 |
| work_end_date | DATE | | 근무 종료일 |
| salary_type | VARCHAR(20) | NOT NULL | hourly/daily/monthly |
| salary_amount | INTEGER | NOT NULL | 급여 금액 |
| salary_negotiable | BOOLEAN | DEFAULT FALSE | 협의 가능 여부 |
| description | TEXT | | 상세 설명 |
| is_urgent | BOOLEAN | DEFAULT FALSE | 급구 여부 |
| status | VARCHAR(20) | DEFAULT 'active' | active/closed/matched |
| view_count | INTEGER | DEFAULT 0 | 조회수 |
| application_count | INTEGER | DEFAULT 0 | 지원자 수 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | 생성일 |
| expires_at | TIMESTAMPTZ | | 만료일 |

---

## 3. API 설계

### 3.1 API 라우트 구조 (Pages Router)

```
/pages/api/
├── auth/
│   └── [...nextauth].ts      # NextAuth.js 핸들러
├── users/
│   ├── me.ts                 # GET: 현재 사용자 정보
│   └── [id].ts               # GET/PUT: 사용자 상세
├── caregivers/
│   ├── index.ts              # GET: 목록, POST: 생성
│   ├── [id]/
│   │   ├── index.ts          # GET/PUT: 상세/수정
│   │   └── certificates.ts   # GET/POST: 자격증
│   └── search.ts             # GET: 검색
├── guardians/
│   ├── index.ts              # GET/POST
│   └── [id]/
│       ├── index.ts          # GET/PUT
│       └── patients.ts       # GET/POST: 환자 정보
├── jobs/
│   ├── index.ts              # GET: 목록, POST: 생성
│   ├── [id]/
│   │   ├── index.ts          # GET/PUT/DELETE
│   │   ├── apply.ts          # POST: 지원하기
│   │   └── applications.ts   # GET: 지원자 목록
│   └── search.ts             # GET: 검색
├── applications/
│   ├── index.ts              # GET: 내 지원 목록
│   └── [id]/
│       ├── index.ts          # GET/PUT: 상세/상태변경
│       └── accept.ts         # POST: 채용 확정
├── chat/
│   ├── rooms/
│   │   ├── index.ts          # GET: 채팅방 목록, POST: 생성
│   │   └── [roomId]/
│   │       ├── index.ts      # GET: 채팅방 정보
│   │       └── messages.ts   # GET/POST: 메시지
│   └── unread.ts             # GET: 안읽은 메시지 수
├── reviews/
│   ├── index.ts              # POST: 리뷰 작성
│   └── [id].ts               # GET: 리뷰 상세
├── notifications/
│   ├── index.ts              # GET: 알림 목록
│   └── read.ts               # PUT: 읽음 처리
└── admin/
    ├── users.ts              # 사용자 관리
    ├── certificates.ts       # 자격증 심사
    └── stats.ts              # 통계
```

### 3.2 주요 API 명세

#### 인증 API
```typescript
// POST /api/auth/[...nextauth]
// NextAuth.js 설정으로 자동 처리

// 지원 Provider:
// - Kakao OAuth
// - Naver OAuth
// - Credentials (이메일/비밀번호) - 선택적

// Callback URLs:
// - /api/auth/callback/kakao
// - /api/auth/callback/naver
```

#### 구인공고 목록 API
```typescript
// GET /api/jobs
// Query Parameters:
interface JobListParams {
  page?: number;           // 페이지 (default: 1)
  limit?: number;          // 페이지당 개수 (default: 20)
  workType?: string;       // 근무형태 (입주/출퇴근/시간제)
  sido?: string;           // 시/도
  sigungu?: string;        // 시/군/구
  salaryType?: string;     // 급여유형
  salaryMin?: number;      // 최소 급여
  sortBy?: 'latest' | 'salary' | 'deadline';
}

// Response:
interface JobListResponse {
  success: boolean;
  data: JobPosting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### 지원하기 API
```typescript
// POST /api/jobs/[id]/apply
// Headers: Authorization: Bearer {token}

// Request Body:
interface ApplyRequest {
  coverLetter?: string;    // 자기소개서 (선택)
}

// Response:
interface ApplyResponse {
  success: boolean;
  data: {
    applicationId: string;
    status: 'pending';
    appliedAt: string;
  };
}
```

#### 채팅 메시지 API
```typescript
// GET /api/chat/rooms/[roomId]/messages
// Query: cursor, limit

// POST /api/chat/rooms/[roomId]/messages
// Request Body:
interface SendMessageRequest {
  content: string;
  messageType?: 'text' | 'image';
  fileUrl?: string;
}

// Response:
interface MessageResponse {
  success: boolean;
  data: Message;
}
```

### 3.3 API 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| AUTH_REQUIRED | 401 | 인증 필요 |
| AUTH_INVALID | 401 | 유효하지 않은 토큰 |
| FORBIDDEN | 403 | 권한 없음 |
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 400 | 유효성 검사 실패 |
| DUPLICATE | 409 | 중복 데이터 |
| RATE_LIMIT | 429 | 요청 제한 초과 |
| SERVER_ERROR | 500 | 서버 오류 |

---

## 4. 인증 시스템

### 4.1 NextAuth.js 설정 (Pages Router)

```typescript
// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from 'next-auth';
import KakaoProvider from 'next-auth/providers/kakao';
import NaverProvider from 'next-auth/providers/naver';
import { SupabaseAdapter } from '@auth/supabase-adapter';

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
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error',
    newUser: '/auth/signup',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.userType = user.userType;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.userType = token.userType as string;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
```

### 4.2 인증 미들웨어

```typescript
// lib/auth.ts
import { getServerSession } from 'next-auth/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return await getServerSession(req, res, authOptions);
}

export function withAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    
    if (!session) {
      return res.status(401).json({ 
        success: false, 
        error: 'AUTH_REQUIRED' 
      });
    }
    
    return handler(req, res, session);
  };
}

export function withRole(roles: string[]) {
  return (
    handler: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<void>
  ) => {
    return withAuth(async (req, res, session) => {
      if (!roles.includes(session.user.userType)) {
        return res.status(403).json({ 
          success: false, 
          error: 'FORBIDDEN' 
        });
      }
      return handler(req, res, session);
    });
  };
}
```

---

## 5. Supabase 클라이언트 설정

### 5.1 클라이언트 설정

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// 브라우저 클라이언트 (클라이언트 사이드)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 서버 클라이언트 (API Routes)
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### 5.2 Realtime 구독

```typescript
// lib/supabase-realtime.ts
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToMessages(
  roomId: string,
  onMessage: (message: any) => void
): RealtimeChannel {
  return supabase
    .channel(`chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_room_id=eq.${roomId}`,
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
```

---

## 6. 외부 서비스 연동

### 6.1 카카오 알림톡

```typescript
// lib/kakao/alimtalk.ts
interface AlimtalkParams {
  templateCode: string;
  recipientPhone: string;
  variables: Record<string, string>;
}

export async function sendAlimtalk({
  templateCode,
  recipientPhone,
  variables,
}: AlimtalkParams): Promise<boolean> {
  try {
    const response = await fetch(process.env.KAKAO_ALIMTALK_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.KAKAO_ALIMTALK_TOKEN}`,
      },
      body: JSON.stringify({
        senderKey: process.env.KAKAO_SENDER_KEY,
        templateCode,
        recipientList: [
          {
            recipientNo: recipientPhone.replace(/-/g, ''),
            templateParameter: variables,
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Alimtalk error:', error);
    return false;
  }
}

// 템플릿 코드
export const ALIMTALK_TEMPLATES = {
  APPLICATION_RECEIVED: 'CARE_001',  // 새 지원 알림
  APPLICATION_ACCEPTED: 'CARE_002',  // 채용 확정 알림
  NEW_MESSAGE: 'CARE_003',           // 새 메시지 알림
  MATCH_COMPLETED: 'CARE_004',       // 매칭 완료 알림
};
```

### 6.2 파일 업로드 (Supabase Storage)

```typescript
// lib/storage.ts
import { supabase } from './supabase';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<boolean> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}
```

---

## 7. 보안 요구사항

### 7.1 인증/인가
- JWT 토큰 기반 세션 관리
- HttpOnly 쿠키로 토큰 저장
- CSRF 보호 (NextAuth 내장)
- Role-based Access Control (RBAC)

### 7.2 데이터 보호
- Supabase RLS (Row Level Security) 적용
- 민감 정보 암호화 (전화번호 등)
- SQL Injection 방지 (Parameterized Query)
- XSS 방지 (React 자동 이스케이프)

### 7.3 통신 보안
- HTTPS 필수 (Vercel 자동 적용)
- API Rate Limiting
- CORS 설정

### 7.4 RLS 정책 예시
```sql
-- 구인공고: 모든 사용자가 활성 공고 조회 가능
CREATE POLICY "Anyone can view active jobs" ON job_postings
  FOR SELECT USING (status = 'active');

-- 구인공고: 본인 공고만 수정 가능
CREATE POLICY "Guardians can update own jobs" ON job_postings
  FOR UPDATE USING (
    guardian_id IN (
      SELECT id FROM guardians WHERE user_id = auth.uid()
    )
  );

-- 메시지: 채팅방 참여자만 조회 가능
CREATE POLICY "Chat participants can view messages" ON messages
  FOR SELECT USING (
    chat_room_id IN (
      SELECT id FROM chat_rooms 
      WHERE caregiver_id IN (SELECT id FROM caregivers WHERE user_id = auth.uid())
      OR guardian_id IN (SELECT id FROM guardians WHERE user_id = auth.uid())
    )
  );
```

---

## 8. 성능 요구사항

### 8.1 응답 시간
| 항목 | 목표 |
|------|------|
| API 응답 (P95) | < 200ms |
| 페이지 로드 (FCP) | < 1.5s |
| 페이지 로드 (LCP) | < 2.5s |

### 8.2 최적화 전략
- Next.js SSR/SSG 활용
- React Query 캐싱
- 이미지 최적화 (next/image)
- 코드 스플리팅 (dynamic import)
- Supabase 인덱스 최적화

---

## 9. 환경 변수

```env
# .env.local

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=CareMatch

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Kakao OAuth
KAKAO_CLIENT_ID=xxx
KAKAO_CLIENT_SECRET=xxx

# Naver OAuth
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx

# Kakao Alimtalk
KAKAO_ALIMTALK_API_URL=https://alimtalk-api.kakao.com/v2/send
KAKAO_ALIMTALK_TOKEN=xxx
KAKAO_SENDER_KEY=xxx
```

---

## 10. 인프라 요구사항

### 10.1 호스팅
- **Frontend/API**: Vercel (Serverless)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network

### 10.2 모니터링
- Vercel Analytics (성능)
- Sentry (에러 추적)
- Supabase Dashboard (DB 모니터링)

### 10.3 CI/CD
- GitHub Actions
- Vercel Preview Deployments
- 자동 배포 (main 브랜치 푸시 시)
