# 🚀 Phase 1: 프로젝트 셋업 (Day 1-2)

> **목표**: 개발 환경 구성 및 기본 구조 설정
> **예상 소요**: 2일
> **담당**: @orchestrator, @frontend, @database

---

## 📋 체크리스트

- [ ] 1.1 Next.js 프로젝트 초기화
- [ ] 1.2 의존성 설치
- [ ] 1.3 TailwindCSS 설정
- [ ] 1.4 shadcn/ui 설치
- [ ] 1.5 프로젝트 구조 생성
- [ ] 1.6 Supabase 연결
- [ ] 1.7 환경 변수 설정
- [ ] 1.8 기본 레이아웃

---

## 1.1 Next.js 프로젝트 초기화

```bash
# 프로젝트 생성
npx create-next-app@14 carematch-v3 \
  --typescript \
  --tailwind \
  --eslint \
  --src-dir \
  --no-app \
  --import-alias "@/*"

cd carematch-v3
```

---

## 1.2 의존성 설치

```bash
# 핵심 의존성
pnpm add @supabase/supabase-js @supabase/auth-helpers-nextjs
pnpm add next-auth @auth/supabase-adapter
pnpm add zod react-hook-form @hookform/resolvers
pnpm add lucide-react date-fns

# 개발 의존성
pnpm add -D @types/node prettier eslint-config-prettier
pnpm add -D supabase
```

---

## 1.3 TailwindCSS 설정

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 고령자 친화적 폰트 크기
      fontSize: {
        'accessible-sm': ['16px', '1.5'],
        'accessible-base': ['18px', '1.6'],
        'accessible-lg': ['20px', '1.6'],
        'accessible-xl': ['24px', '1.5'],
        'accessible-2xl': ['28px', '1.4'],
        'accessible-3xl': ['32px', '1.3'],
      },
      // 최소 터치 영역
      spacing: {
        'touch-min': '48px',
        'touch-comfortable': '56px',
      },
      // 브랜드 컬러
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
        },
      },
      // 고대비 색상
      textColor: {
        'high-contrast': '#1a1a1a',
        'medium-contrast': '#4a4a4a',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

---

## 1.4 shadcn/ui 설치

```bash
# shadcn/ui 초기화
npx shadcn-ui@latest init

# 컴포넌트 설치
npx shadcn-ui@latest add button card input label select textarea
npx shadcn-ui@latest add dialog sheet tabs avatar badge
npx shadcn-ui@latest add form toast separator skeleton
```

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 1.5 프로젝트 구조 생성

```bash
# 디렉토리 구조 생성
mkdir -p src/{components/{layout,common,caregiver,guardian,chat},hooks,lib,types,styles}
mkdir -p src/pages/{auth,caregiver,guardian,chat,api}
mkdir -p supabase/migrations
mkdir -p public/images

# 파일 생성
touch src/lib/{supabase,auth,utils,validation}.ts
touch src/types/{index,api,supabase}.ts
touch src/hooks/{useAuth,useJobs,useChat}.ts
```

**구조**:
```
src/
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx
│   ├── auth/
│   ├── caregiver/
│   ├── guardian/
│   ├── chat/
│   └── api/
├── components/
│   ├── layout/
│   ├── common/
│   ├── caregiver/
│   ├── guardian/
│   └── chat/
├── hooks/
├── lib/
├── types/
└── styles/
```

---

## 1.6 Supabase 연결

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// 서버사이드용 (Service Role)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

---

## 1.7 환경 변수 설정

```bash
# .env.local
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Kakao
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Naver
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret
```

```bash
# .env.example (커밋용)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

---

## 1.8 기본 레이아웃

```typescript
// src/components/layout/Layout.tsx
import { type FC, type ReactNode } from 'react'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Footer } from './Footer'

interface LayoutProps {
  children: ReactNode
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <MobileNav />
      <Footer />
    </div>
  )
}
```

```typescript
// src/components/layout/Header.tsx
import { type FC } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const Header: FC = () => {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-primary-600">
          CareMatch
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          {session ? (
            <>
              <Link href={`/${session.user.role}`} className="text-lg hover:text-primary-600">
                대시보드
              </Link>
              <Link href="/chat" className="text-lg hover:text-primary-600">
                채팅
              </Link>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={session.user.image ?? undefined} />
                  <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
                </Avatar>
                <Button 
                  variant="outline" 
                  onClick={() => signOut()}
                  className="min-h-[48px] text-lg"
                >
                  로그아웃
                </Button>
              </div>
            </>
          ) : (
            <Link href="/auth/login">
              <Button className="min-h-[48px] text-lg px-6">
                로그인
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
```

---

## ✅ 완료 확인

Phase 1 완료 시 다음이 가능해야 합니다:

1. `pnpm dev` 실행 시 로컬 서버 정상 작동
2. shadcn/ui 컴포넌트 렌더링
3. Supabase 연결 확인
4. 기본 레이아웃 표시

---

## ➡️ 다음 단계

Phase 2로 진행: [PHASE-2-AUTH.md](./PHASE-2-AUTH.md)

---

*Phase 1 v1.0*
