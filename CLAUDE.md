# 🏥 CareMatch V3 - Claude Code 개발 지침서

> **버전**: 3.0 (Pages Router Architecture)  
> **모드**: YOLO (`--dangerously-skip-permissions`)  
> **환경**: Claude Code + VSCode + Cursor  
> **대상 사용자**: 50-70세 고령층 (접근성 최우선)

---

## 📋 프로젝트 개요

CareMatch V3는 요양병원/요양원 간병인과 보호자를 연결하는 **구인구직 플랫폼**입니다.

### 핵심 기능
| 사용자 | 주요 기능 |
|--------|----------|
| **간병인** | 일자리 검색, 지원, 프로필 관리, 자격증 등록 |
| **보호자** | 구인글 등록, 간병인 검색, 지원자 관리 |
| **공통** | 실시간 채팅, 리뷰 시스템, 카카오 알림톡 |

### 기술 스택
| 영역 | 기술 |
|------|------|
| Framework | Next.js 14 (Pages Router) |
| Language | TypeScript 5.x |
| UI | shadcn/ui + TailwindCSS |
| Auth | NextAuth.js (Kakao, Naver) |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime |
| Notification | Kakao Alimtalk |
| Deploy | Vercel |

---

## 🚀 YOLO 모드 실행

```bash
# Claude Code YOLO 모드 실행
claude --dangerously-skip-permissions

# 또는 별칭 사용
alias yolo="claude --dangerously-skip-permissions"
yolo

# 프로젝트 시작
yolo "CareMatch V3 프로젝트를 시작합니다. CLAUDE.md를 참조하세요."
```

---

## 📁 프로젝트 구조

```
carematch-v3/
├── CLAUDE.md                    # 이 파일 (Claude Code 자동 참조)
├── .claude/
│   └── settings.json            # Claude Code 설정
├── docs/
│   ├── agents/                  # 멀티 에이전트 프롬프트
│   │   ├── AGENT-ORCHESTRATOR.md
│   │   ├── AGENT-FRONTEND.md
│   │   ├── AGENT-BACKEND.md
│   │   └── AGENT-DATABASE.md
│   ├── phases/                  # 개발 단계별 가이드
│   │   ├── PHASE-1-SETUP.md
│   │   ├── PHASE-2-AUTH.md
│   │   ├── PHASE-3-CORE.md
│   │   ├── PHASE-4-CHAT.md
│   │   └── PHASE-5-DEPLOY.md
│   ├── mcp/                     # MCP 설정
│   │   └── mcp-config.json
│   └── skills/                  # Skills 설정
│       └── carematch-skills.md
├── src/
│   ├── pages/                   # Pages Router
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   ├── auth/
│   │   ├── caregiver/
│   │   ├── guardian/
│   │   ├── chat/
│   │   └── api/
│   ├── components/
│   │   ├── layout/
│   │   ├── common/
│   │   ├── caregiver/
│   │   ├── guardian/
│   │   └── chat/
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── auth.ts
│   │   └── kakao.ts
│   ├── hooks/
│   ├── types/
│   └── styles/
├── public/
├── prisma/                      # 선택적 (Supabase 직접 사용 시 불필요)
└── supabase/
    └── migrations/
```

---

## 🎯 접근성 최우선 원칙

### 대상 사용자: 50-70세 고령층

```typescript
// tailwind.config.ts - 고령자 친화적 설정
const config = {
  theme: {
    extend: {
      fontSize: {
        'accessible-sm': '16px',    // 최소 폰트
        'accessible-base': '18px',  // 기본 폰트
        'accessible-lg': '20px',    // 강조 텍스트
        'accessible-xl': '24px',    // 제목
        'accessible-2xl': '28px',   // 대제목
      },
      spacing: {
        'touch-min': '48px',        // 최소 터치 영역
        'touch-comfortable': '56px', // 편안한 터치 영역
      },
    },
  },
}
```

### UI/UX 규칙
| 항목 | 규칙 |
|------|------|
| **폰트 크기** | 최소 16px, 기본 18px |
| **버튼 크기** | 최소 48x48px, 권장 56x56px |
| **색상 대비** | WCAG AA 이상 (4.5:1) |
| **여백** | 넉넉하게, 요소 간 최소 16px |
| **아이콘** | 텍스트와 함께 사용, 단독 사용 금지 |
| **에러 메시지** | 친절하고 명확하게 |

---

## 🤖 멀티 에이전트 워크플로우

### 에이전트 역할

| 에이전트 | 역할 | 담당 영역 |
|---------|------|----------|
| **Orchestrator** | 총괄 조율 | 작업 분배, 의존성 관리, 진행 상황 추적 |
| **Frontend** | UI 개발 | React, shadcn/ui, 반응형, 접근성 |
| **Backend** | API 개발 | Next.js API Routes, NextAuth |
| **Database** | DB 설계 | Supabase, 마이그레이션, RLS |

### 병렬 작업 패턴

```
┌─────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                        │
│              (작업 분배 & 진행 상황 추적)                      │
└─────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  Frontend   │    │   Backend   │    │  Database   │
    │   Agent     │    │   Agent     │    │   Agent     │
    │             │    │             │    │             │
    │ • 컴포넌트   │    │ • API 라우트 │    │ • 스키마    │
    │ • 페이지     │    │ • 인증      │    │ • RLS 정책  │
    │ • 스타일     │    │ • 미들웨어  │    │ • 마이그레이션│
    └─────────────┘    └─────────────┘    └─────────────┘
```

---

## 📝 개발 단계 (20일)

### Phase 1: 프로젝트 셋업 (Day 1-2)
- [ ] Next.js 14 + TypeScript 초기화
- [ ] shadcn/ui 설치 및 테마 설정
- [ ] Supabase 프로젝트 연결
- [ ] 환경 변수 설정
- [ ] 기본 레이아웃 컴포넌트

### Phase 2: 인증 시스템 (Day 3-5)
- [ ] NextAuth.js 설정
- [ ] Kakao 소셜 로그인
- [ ] Naver 소셜 로그인
- [ ] 프로필 완성 페이지
- [ ] 인증 미들웨어

### Phase 3: 핵심 기능 (Day 6-12)
- [ ] 간병인 대시보드
- [ ] 보호자 대시보드
- [ ] 구인글 CRUD
- [ ] 지원 시스템
- [ ] 프로필 관리
- [ ] 리뷰 시스템

### Phase 4: 채팅 시스템 (Day 13-16)
- [ ] Supabase Realtime 설정
- [ ] 채팅방 목록
- [ ] 채팅 UI
- [ ] 실시간 메시지
- [ ] 읽음 표시

### Phase 5: 배포 및 최적화 (Day 17-20)
- [ ] Kakao Alimtalk 연동
- [ ] 성능 최적화
- [ ] 접근성 테스트
- [ ] Vercel 배포
- [ ] 모니터링 설정

---

## ⚡ 빠른 명령어

```bash
# 개발 서버
pnpm dev

# 빌드
pnpm build

# 타입 체크
pnpm typecheck

# 린트
pnpm lint

# Supabase 로컬
pnpm supabase:start

# 마이그레이션 생성
pnpm supabase:migrate

# 타입 생성 (Supabase)
pnpm supabase:types
```

---

## 🔧 환경 변수

```env
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Kakao
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret
KAKAO_ALIMTALK_KEY=your-alimtalk-key

# Naver
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

---

## 📐 코딩 컨벤션

### 컴포넌트 구조
```typescript
// components/caregiver/JobCard.tsx
import { type FC } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { JobPosting } from '@/types'

interface JobCardProps {
  job: JobPosting
  onApply?: (jobId: string) => void
}

/**
 * 구인글 카드 컴포넌트
 * @description 간병인이 볼 수 있는 구인글 정보 카드
 */
export const JobCard: FC<JobCardProps> = ({ job, onApply }) => {
  return (
    <Card className="p-6">
      {/* 고령자 친화적 UI */}
      <CardHeader>
        <h3 className="text-accessible-lg font-bold">{job.title}</h3>
      </CardHeader>
      <CardContent>
        <Button 
          size="lg" 
          className="min-h-touch-comfortable text-accessible-base"
          onClick={() => onApply?.(job.id)}
        >
          지원하기
        </Button>
      </CardContent>
    </Card>
  )
}
```

### API 라우트 구조
```typescript
// pages/api/jobs/index.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { supabase } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({ error: '로그인이 필요합니다' })
  }

  switch (req.method) {
    case 'GET':
      // 구인글 목록 조회
      break
    case 'POST':
      // 구인글 생성
      break
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
```

---

## 🔗 관련 문서

- [에이전트 프롬프트](./docs/agents/)
  - [Orchestrator](./docs/agents/AGENT-ORCHESTRATOR.md)
  - [Frontend](./docs/agents/AGENT-FRONTEND.md)
  - [Backend](./docs/agents/AGENT-BACKEND.md)
  - [Database](./docs/agents/AGENT-DATABASE.md)
- [개발 단계 가이드](./docs/phases/)
- [MCP 설정](./docs/mcp/mcp-config.json)
- [Skills 설정](./docs/skills/carematch-skills.md)

---

## ⚠️ 중요 규칙

1. **접근성 최우선**: 50-70세 사용자를 항상 고려
2. **Type Safety**: TypeScript strict 모드 필수
3. **컴포넌트 재사용**: shadcn/ui 기반
4. **에러 처리**: 사용자 친화적 메시지
5. **성능**: Core Web Vitals 최적화
6. **보안**: RLS 정책 필수 적용

---

## 🆘 문제 해결

### 자주 발생하는 이슈

| 이슈 | 해결 방법 |
|------|----------|
| Supabase 연결 오류 | 환경 변수 확인, RLS 정책 확인 |
| NextAuth 세션 없음 | NEXTAUTH_SECRET 설정 확인 |
| Kakao 로그인 실패 | 리다이렉트 URI 설정 확인 |
| 빌드 타입 에러 | `pnpm typecheck` 실행 |
| Realtime 연결 안됨 | Supabase Realtime 활성화 확인 |

---

*마지막 업데이트: 2026-01-02*
