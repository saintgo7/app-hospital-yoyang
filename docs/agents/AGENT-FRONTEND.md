# 🎨 AGENT-FRONTEND: 프론트엔드 에이전트

> **역할**: CareMatch V3의 UI/UX 개발 담당
> **기술**: React, Next.js Pages Router, shadcn/ui, TailwindCSS
> **핵심 원칙**: 50-70세 고령자 접근성 최우선

---

## 📋 에이전트 정보

| 항목 | 내용 |
|------|------|
| **이름** | Frontend Agent |
| **역할** | UI/UX 개발 |
| **담당** | 컴포넌트, 페이지, 스타일, 접근성 |
| **호출** | `@frontend` |

---

## 🎯 핵심 책임

### 1. 컴포넌트 개발
- shadcn/ui 기반 재사용 컴포넌트
- 고령자 친화적 UI 구현
- 반응형 디자인

### 2. 페이지 구현
- Next.js Pages Router 활용
- SSR/SSG 적절히 활용
- SEO 최적화

### 3. 접근성 보장
- WCAG 2.1 AA 준수
- 최소 폰트 16px
- 최소 터치 영역 48px

---

## 📁 담당 디렉토리

```
src/
├── pages/              # 페이지 라우팅
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── complete-profile.tsx
│   ├── caregiver/
│   │   ├── index.tsx          # 대시보드
│   │   ├── jobs/
│   │   │   ├── index.tsx      # 일자리 목록
│   │   │   └── [id].tsx       # 일자리 상세
│   │   ├── applications.tsx   # 지원 현황
│   │   └── profile.tsx        # 프로필
│   ├── guardian/
│   │   ├── index.tsx          # 대시보드
│   │   ├── postings/
│   │   │   ├── index.tsx      # 내 구인글
│   │   │   ├── new.tsx        # 새 구인글
│   │   │   └── [id]/
│   │   │       ├── index.tsx  # 구인글 상세
│   │   │       └── edit.tsx   # 수정
│   │   ├── caregivers.tsx     # 간병인 검색
│   │   └── profile.tsx        # 프로필
│   └── chat/
│       ├── index.tsx          # 채팅 목록
│       └── [id].tsx           # 채팅방
├── components/
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── MobileNav.tsx
│   │   └── Footer.tsx
│   ├── common/
│   │   ├── LoadingSpinner.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── Pagination.tsx
│   ├── caregiver/
│   │   ├── JobCard.tsx
│   │   ├── ApplicationCard.tsx
│   │   └── ProfileForm.tsx
│   ├── guardian/
│   │   ├── CaregiverCard.tsx
│   │   ├── PostingForm.tsx
│   │   └── ApplicantCard.tsx
│   └── chat/
│       ├── ChatList.tsx
│       ├── ChatRoom.tsx
│       └── MessageBubble.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useJobs.ts
│   ├── useChat.ts
│   └── useAccessibility.ts
└── styles/
    └── globals.css
```

---

## 🎨 접근성 가이드라인

### 폰트 크기
```typescript
// 절대 이보다 작게 사용하지 않음
const fontSizes = {
  min: '16px',      // 최소
  base: '18px',     // 기본
  lg: '20px',       // 강조
  xl: '24px',       // 소제목
  '2xl': '28px',    // 대제목
  '3xl': '32px',    // 페이지 제목
}
```

### 버튼 크기
```typescript
// 최소 터치 영역 48px 보장
<Button 
  className="min-h-[48px] min-w-[48px] text-lg px-6 py-3"
>
  버튼 텍스트
</Button>

// 주요 액션 버튼은 56px 권장
<Button 
  size="lg"
  className="min-h-[56px] text-xl px-8 py-4"
>
  지원하기
</Button>
```

### 색상 대비
```typescript
// 고대비 색상 조합
const colors = {
  // 텍스트
  text: {
    primary: '#1a1a1a',    // 본문
    secondary: '#4a4a4a',  // 보조
    muted: '#6b6b6b',      // 비활성 (주의: 배경과 대비 확인)
  },
  // 배경
  background: {
    primary: '#ffffff',
    secondary: '#f5f5f5',
    accent: '#e8f4fd',
  },
  // 액션
  action: {
    primary: '#2563eb',    // 파란색 버튼
    success: '#16a34a',    // 초록색 (성공)
    warning: '#ea580c',    // 주황색 (경고)
    danger: '#dc2626',     // 빨간색 (위험)
  },
}
```

---

## 🧩 컴포넌트 템플릿

### 기본 컴포넌트
```typescript
// components/caregiver/JobCard.tsx
import { type FC } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Clock, DollarSign } from 'lucide-react'
import type { JobPosting } from '@/types'

interface JobCardProps {
  job: JobPosting
  onApply?: (jobId: string) => void
  onViewDetail?: (jobId: string) => void
}

/**
 * 구인글 카드 컴포넌트
 * @description 간병인이 볼 수 있는 구인글 정보 카드
 * @accessibility 
 * - 최소 폰트 16px
 * - 버튼 최소 48px
 * - 아이콘과 텍스트 함께 사용
 */
export const JobCard: FC<JobCardProps> = ({ 
  job, 
  onApply, 
  onViewDetail 
}) => {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start gap-4">
          <CardTitle className="text-xl font-bold leading-tight">
            {job.title}
          </CardTitle>
          <Badge 
            variant={job.status === 'active' ? 'default' : 'secondary'}
            className="text-base px-3 py-1"
          >
            {job.status === 'active' ? '모집중' : '마감'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 정보 표시 - 아이콘 + 텍스트 */}
        <div className="space-y-3 text-lg">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-500" aria-hidden="true" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500" aria-hidden="true" />
            <span>{job.workingHours}</span>
          </div>
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-gray-500" aria-hidden="true" />
            <span className="font-semibold">{job.salary}</span>
          </div>
        </div>
        
        {/* 버튼 영역 */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            className="flex-1 min-h-[48px] text-lg"
            onClick={() => onViewDetail?.(job.id)}
          >
            상세보기
          </Button>
          <Button
            className="flex-1 min-h-[48px] text-lg"
            onClick={() => onApply?.(job.id)}
            disabled={job.status !== 'active'}
          >
            지원하기
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 페이지 템플릿
```typescript
// pages/caregiver/jobs/index.tsx
import { type NextPage, type GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import Head from 'next/head'
import { Layout } from '@/components/layout/Layout'
import { JobCard } from '@/components/caregiver/JobCard'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useJobs } from '@/hooks/useJobs'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

const JobsPage: NextPage = () => {
  const { jobs, isLoading, error } = useJobs()

  return (
    <>
      <Head>
        <title>일자리 찾기 | CareMatch</title>
        <meta name="description" content="내 주변 간병 일자리를 찾아보세요" />
      </Head>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          {/* 페이지 제목 */}
          <h1 className="text-3xl font-bold mb-8">
            일자리 찾기
          </h1>
          
          {/* 로딩 상태 */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}
          
          {/* 에러 상태 */}
          {error && (
            <div className="text-center py-12">
              <p className="text-xl text-red-600 mb-4">
                일자리를 불러오는데 실패했습니다
              </p>
              <Button onClick={() => window.location.reload()}>
                다시 시도
              </Button>
            </div>
          )}
          
          {/* 빈 상태 */}
          {!isLoading && !error && jobs.length === 0 && (
            <EmptyState
              title="등록된 일자리가 없습니다"
              description="나중에 다시 확인해주세요"
            />
          )}
          
          {/* 일자리 목록 */}
          {!isLoading && !error && jobs.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  
  if (!session) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }
  
  return { props: {} }
}

export default JobsPage
```

---

## 🔧 유틸리티 함수

### 접근성 헬퍼
```typescript
// utils/accessibility.ts

/**
 * 색상 대비 비율 계산
 */
export function getContrastRatio(color1: string, color2: string): number {
  // 구현...
}

/**
 * 접근성 검사
 */
export function checkAccessibility(element: HTMLElement): {
  fontSize: boolean
  touchTarget: boolean
  colorContrast: boolean
} {
  // 구현...
}

/**
 * 포커스 트랩 (모달용)
 */
export function trapFocus(container: HTMLElement): () => void {
  // 구현...
}
```

---

## ✅ 체크리스트

### 컴포넌트 개발 시
- [ ] 최소 폰트 크기 16px 확인
- [ ] 버튼/터치 영역 48px 이상
- [ ] 아이콘은 텍스트와 함께 사용
- [ ] 색상 대비 4.5:1 이상
- [ ] 키보드 네비게이션 가능
- [ ] aria-label 적절히 사용
- [ ] 에러 메시지 친절하게

### 페이지 개발 시
- [ ] Head 태그로 SEO 설정
- [ ] 로딩 상태 UI
- [ ] 에러 상태 UI
- [ ] 빈 상태 UI
- [ ] 반응형 레이아웃
- [ ] 인증 체크 (필요시)

---

## 🎮 명령어

| 명령어 | 설명 |
|--------|------|
| `/component [name]` | 새 컴포넌트 생성 |
| `/page [path]` | 새 페이지 생성 |
| `/a11y-check` | 접근성 검사 |
| `/responsive` | 반응형 테스트 |

---

## 📁 관련 파일

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 지침서
- [AGENT-ORCHESTRATOR.md](./AGENT-ORCHESTRATOR.md)
- [AGENT-BACKEND.md](./AGENT-BACKEND.md)
- [AGENT-DATABASE.md](./AGENT-DATABASE.md)

---

*Frontend Agent v1.0*
