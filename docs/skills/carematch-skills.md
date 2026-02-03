# 🛠️ CareMatch V3 Skills 설정

> **목적**: Claude Code에서 CareMatch V3 개발 시 활용할 수 있는 커스텀 스킬 정의
> **사용**: Claude Code가 자동으로 이 파일을 참조하여 작업 수행

---

## 📋 스킬 목록

### 1. 컴포넌트 생성 스킬

#### `create-component`
새로운 React 컴포넌트를 생성합니다.

**트리거**: `@skill create-component [ComponentName]`

**템플릿**:
```typescript
// components/{category}/{ComponentName}.tsx
import { type FC } from 'react'

interface {ComponentName}Props {
  // props 정의
}

/**
 * {ComponentName} 컴포넌트
 * @description [설명]
 * @accessibility 
 * - 최소 폰트 16px
 * - 버튼 최소 48px
 */
export const {ComponentName}: FC<{ComponentName}Props> = (props) => {
  return (
    <div className="text-lg">
      {/* 구현 */}
    </div>
  )
}
```

**규칙**:
- 파일명: PascalCase
- Props 인터페이스 필수
- JSDoc 주석 필수
- 접근성 가이드라인 준수

---

### 2. 페이지 생성 스킬

#### `create-page`
새로운 Next.js 페이지를 생성합니다.

**트리거**: `@skill create-page [path]`

**템플릿**:
```typescript
// pages/{path}.tsx
import { type NextPage, type GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import Head from 'next/head'
import { Layout } from '@/components/layout/Layout'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

interface PageProps {
  // props 정의
}

const Page: NextPage<PageProps> = (props) => {
  return (
    <>
      <Head>
        <title>페이지 제목 | CareMatch</title>
        <meta name="description" content="페이지 설명" />
      </Head>
      
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">
            페이지 제목
          </h1>
          
          {/* 내용 */}
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

export default Page
```

**규칙**:
- Head 태그로 SEO 설정
- Layout 컴포넌트 사용
- 인증 필요시 getServerSideProps

---

### 3. API 라우트 생성 스킬

#### `create-api`
새로운 API 라우트를 생성합니다.

**트리거**: `@skill create-api [path]`

**템플릿**:
```typescript
// pages/api/{path}.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

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
  const session = await getServerSession(req, res, authOptions)
  
  if (!session) {
    return res.status(401).json({
      success: false,
      error: '로그인이 필요합니다',
    })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session)
    case 'POST':
      return handlePost(req, res, session)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({
        success: false,
        error: `${req.method} 메서드는 지원하지 않습니다`,
      })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  session: any
) {
  try {
    // 구현
    return res.status(200).json({ success: true, data: {} })
  } catch (error) {
    console.error('API 오류:', error)
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다',
    })
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  session: any
) {
  try {
    // 구현
    return res.status(201).json({ success: true, data: {} })
  } catch (error) {
    console.error('API 오류:', error)
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다',
    })
  }
}
```

**규칙**:
- 인증 체크 필수
- Zod로 입력 검증
- try-catch로 에러 처리
- 적절한 HTTP 상태 코드

---

### 4. Hook 생성 스킬

#### `create-hook`
새로운 커스텀 훅을 생성합니다.

**트리거**: `@skill create-hook [hookName]`

**템플릿**:
```typescript
// hooks/{hookName}.ts
import { useState, useEffect, useCallback } from 'react'

interface {HookName}Options {
  // 옵션
}

interface {HookName}Return {
  // 반환 타입
  data: any
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * {hookName} 훅
 * @description [설명]
 * @example
 * const { data, isLoading } = {hookName}()
 */
export function {hookName}(options?: {HookName}Options): {HookName}Return {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      // 데이터 fetch
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}
```

---

### 5. 데이터베이스 마이그레이션 스킬

#### `create-migration`
새로운 데이터베이스 마이그레이션을 생성합니다.

**트리거**: `@skill create-migration [name]`

**템플릿**:
```sql
-- supabase/migrations/{timestamp}_{name}.sql

-- ============================================
-- {name}
-- ============================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS {table_name} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 필드 정의
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_{table_name}_{field} ON {table_name}({field});

-- RLS 활성화
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "{table_name}_select" ON {table_name}
  FOR SELECT USING (true);

-- 트리거
CREATE TRIGGER update_{table_name}_updated_at
  BEFORE UPDATE ON {table_name}
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 6. 접근성 검사 스킬

#### `check-accessibility`
컴포넌트의 접근성을 검사합니다.

**트리거**: `@skill check-accessibility [ComponentName]`

**검사 항목**:
```markdown
## 접근성 체크리스트

### 텍스트
- [ ] 최소 폰트 크기 16px 이상
- [ ] 줄 간격 1.5 이상
- [ ] 텍스트 대비 비율 4.5:1 이상

### 인터랙션
- [ ] 터치 영역 최소 48x48px
- [ ] 클릭 영역 충분한 여백
- [ ] 포커스 표시 명확

### 시각
- [ ] 아이콘에 레이블 또는 aria-label
- [ ] 색상만으로 정보 전달하지 않음
- [ ] 움직이는 요소 제어 가능

### 구조
- [ ] 의미 있는 HTML 태그 사용
- [ ] 헤딩 계층 구조 올바름
- [ ] 키보드 네비게이션 가능
```

---

### 7. 타입 생성 스킬

#### `generate-types`
Supabase 스키마에서 TypeScript 타입을 생성합니다.

**트리거**: `@skill generate-types`

**명령어**:
```bash
pnpm supabase gen types typescript --local > src/types/supabase.ts
```

---

## 🎮 스킬 사용 예시

### 컴포넌트 생성
```
@skill create-component JobCard
- category: caregiver
- props: job, onApply, onViewDetail
- 접근성: 고령자 친화적
```

### 페이지 생성
```
@skill create-page caregiver/jobs/[id]
- 인증: 필요
- SSR: getServerSideProps
- SEO: 일자리 상세
```

### API 생성
```
@skill create-api jobs/[id]/apply
- methods: POST
- auth: caregiver only
- validation: Zod
```

---

### 8. HTML 종합 보고서 생성 스킬

#### `generate-html-report`
프로젝트의 종합 개발 보고서를 HTML 형식으로 생성합니다.

**트리거**: `@skill generate-html-report`

**설명**:
프로젝트 상태, 개발 로그, 에러 분석, 성능 측정, 최적화 결과, 배포 정보를 포함한 상호 연결된 HTML 문서를 생성합니다.

**생성 파일**:
```
docs/html/
├── index.html              # 메인 대시보드
├── development-plan.html   # 개발 계획 (5단계)
├── dev-logs.html          # 개발 로그 타임라인
├── errors.html            # 에러 분석 및 해결
├── deployment.html        # 배포 전략 및 설정
├── performance.html       # 성능 측정 결과
└── optimization.html      # 최적화 보고서
```

**작업 순서**:

1. **데이터 수집**
   ```bash
   # 프로젝트 상태 읽기
   - docs/dev-logs/PROJECT-STATUS.md
   - docs/dev-logs/README.md
   - docs/dev-logs/*.md (개별 로그)

   # 빌드 결과 수집
   - pnpm build 출력 분석
   - .next/build-manifest.json

   # 에러 로그 수집
   - 개발 로그에서 에러 섹션 추출
   ```

2. **HTML 생성 템플릿**
   ```html
   <!DOCTYPE html>
   <html lang="ko">
   <head>
     <meta charset="UTF-8">
     <title>{페이지 제목} - CareMatch V3</title>
     <script src="https://cdn.tailwindcss.com"></script>
   </head>
   <body class="bg-gray-50">
     <!-- Navigation Bar -->
     <nav class="border-b bg-white sticky top-0">
       <div class="container mx-auto px-4 py-4 flex justify-between">
         <h1 class="text-2xl font-bold text-blue-600">CareMatch V3</h1>
         <div class="flex space-x-4 text-sm">
           <a href="index.html" class="text-gray-600">대시보드</a>
           <a href="development-plan.html" class="text-gray-600">개발계획</a>
           <a href="dev-logs.html" class="text-gray-600">개발로그</a>
           <a href="errors.html" class="text-gray-600">에러분석</a>
           <a href="deployment.html" class="text-gray-600">배포</a>
           <a href="performance.html" class="text-gray-600">성능</a>
           <a href="optimization.html" class="text-gray-600">최적화</a>
         </div>
       </div>
     </nav>

     <!-- Main Content -->
     <main class="container mx-auto px-4 py-8">
       <h1 class="text-4xl font-bold mb-4">{제목}</h1>
       <p class="text-lg text-gray-600 mb-8">{설명}</p>

       <!-- Content Sections -->
       {동적 컨텐츠}
     </main>

     <!-- Footer -->
     <footer class="border-t mt-16 py-8 bg-white">
       <div class="container mx-auto px-4 text-center text-sm text-gray-600">
         <p>CareMatch V3 - {페이지명} | Generated by Claude Code</p>
       </div>
     </footer>
   </body>
   </html>
   ```

3. **각 페이지별 컨텐츠**

   **index.html** - 메인 대시보드
   ```html
   <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
     <!-- Phase Progress -->
     <div class="bg-white border rounded-lg p-6">
       <h3 class="text-xl font-bold mb-4">Phase 1</h3>
       <div class="w-full bg-gray-200 rounded h-2 mb-2">
         <div class="bg-green-600 h-2 rounded" style="width:100%"></div>
       </div>
       <p class="text-sm text-gray-600">100% 완료</p>
     </div>
     <!-- 반복 -->
   </div>
   ```

   **development-plan.html** - 개발 계획
   ```html
   <div class="grid gap-6">
     <div class="bg-white border rounded-lg p-6">
       <h2 class="text-2xl font-bold mb-4">Phase 1: 프로젝트 셋업</h2>
       <div class="w-full bg-gray-200 rounded h-2 mb-4">
         <div class="bg-green-600 h-2 rounded" style="width:100%"></div>
       </div>
       <ul class="space-y-2 text-gray-600">
         <li>✓ Next.js 14 + TypeScript 초기화</li>
         <!-- 체크리스트 -->
       </ul>
     </div>
   </div>
   ```

   **dev-logs.html** - 개발 로그
   ```html
   <div class="space-y-4">
     <div class="bg-white border rounded-lg p-6">
       <div class="flex items-center gap-3 mb-3">
         <span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
           완료
         </span>
         <h3 class="text-xl font-bold">01. 초기 셋업 (2026-01-02)</h3>
       </div>
       <p class="text-gray-600 mb-3">프로젝트 초기화, Claude Code 설정</p>
       <ul class="list-disc list-inside text-sm text-gray-600">
         <li>Next.js 15 + TypeScript 초기화</li>
       </ul>
     </div>
   </div>
   ```

   **errors.html** - 에러 분석
   ```html
   <div class="bg-white rounded-lg border p-6">
     <div class="flex items-start gap-4 mb-4">
       <span class="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
         빌드 에러
       </span>
       <div class="flex-1">
         <h3 class="text-xl font-bold mb-2">NextRouter was not mounted</h3>
         <p class="text-gray-600 text-sm">Auth 페이지에서 useRouter() SSG 호환 문제</p>
       </div>
     </div>
     <div class="bg-red-50 p-4 rounded mb-4">
       <h4 class="font-semibold mb-2">에러 메시지:</h4>
       <code class="block text-sm">{에러 메시지}</code>
     </div>
     <div class="bg-green-50 p-4 rounded">
       <h4 class="font-semibold mb-2 text-green-900">✓ 해결 방법:</h4>
       <p class="text-sm mb-2">{해결 설명}</p>
       <code class="block bg-gray-800 text-green-400 p-3 rounded text-sm">
         {코드 예시}
       </code>
     </div>
   </div>
   ```

   **performance.html** - 성능 측정
   ```html
   <div class="bg-white border rounded-lg p-6">
     <h2 class="text-2xl font-bold mb-4">빌드 결과</h2>
     <div class="grid md:grid-cols-3 gap-4">
       <div class="text-center p-4 bg-gray-50 rounded">
         <div class="text-3xl font-bold text-blue-600 mb-2">33</div>
         <div class="text-sm text-gray-600">총 라우트</div>
       </div>
       <div class="text-center p-4 bg-gray-50 rounded">
         <div class="text-3xl font-bold text-green-600 mb-2">97.1kB</div>
         <div class="text-sm text-gray-600">Shared JS</div>
       </div>
     </div>
   </div>
   ```

   **optimization.html** - 최적화 보고서
   ```html
   <div class="card">
     <div class="flex items-center gap-3 mb-4">
       <span class="badge badge-critical">CRITICAL</span>
       <h2 class="text-2xl font-bold">1. Bundle Size 최적화</h2>
     </div>
     <div class="bg-gray-50 p-4 rounded">
       <h3 class="font-semibold mb-2">✓ Barrel Import 제거</h3>
       <div class="grid md:grid-cols-2 gap-4 text-sm">
         <div>
           <p class="text-red-600 font-mono mb-2">// Before</p>
           <code class="block bg-red-50 p-2 rounded">...</code>
         </div>
         <div>
           <p class="text-green-600 font-mono mb-2">// After</p>
           <code class="block bg-green-50 p-2 rounded">...</code>
         </div>
       </div>
     </div>
   </div>
   ```

   **deployment.html** - 배포 전략
   ```html
   <div class="bg-white border rounded-lg p-6">
     <h2 class="text-2xl font-bold mb-4">1. Vercel 배포 설정</h2>
     <div class="bg-gray-800 text-green-400 p-4 rounded">
       <code class="text-sm">vercel --prod</code>
     </div>
     <ul class="mt-4 space-y-2 text-gray-600">
       <li>✓ Next.js 15.5.9 자동 감지</li>
       <li>✓ 자동 빌드 최적화</li>
     </ul>
   </div>
   ```

**스타일 규칙**:
```css
/* Tailwind 클래스 사용 */
.badge {
  @apply inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold;
}
.badge-critical { @apply bg-red-500 text-white; }
.badge-high { @apply bg-orange-500 text-white; }
.badge-medium { @apply bg-yellow-500 text-white; }
.card { @apply rounded-lg border bg-white shadow-sm p-6; }
```

**사용 예시**:
```
Claude Code에서 다음과 같이 실행:

1. 자동 트리거 (세션 종료 시):
   - "개발 로그 작성해줘" 명령 후 자동 실행

2. 수동 트리거:
   - "@skill generate-html-report"
   - "HTML 종합 보고서 생성해줘"
   - "프로젝트 문서화해줘"

3. 업데이트:
   - "@skill generate-html-report --update"
   - 기존 HTML 파일 업데이트
```

**체크리스트**:
- [ ] docs/html/ 디렉토리 생성
- [ ] 7개 HTML 파일 생성 (index, development-plan, dev-logs, errors, deployment, performance, optimization)
- [ ] 모든 페이지에 통일된 네비게이션 바 추가
- [ ] shadcn/ui 스타일 (Tailwind) 적용
- [ ] 페이지 간 링크 연결
- [ ] 반응형 디자인 적용 (md:, lg: breakpoints)
- [ ] 아이콘/이모지 대신 텍스트 플레이스홀더 사용
- [ ] 진행률 바 (progress bar) 추가
- [ ] 에러 해결률 통계 추가
- [ ] Footer에 생성 날짜 표시

---

## 📝 스킬 확장

새로운 스킬 추가 시:

1. 이 파일에 스킬 정의 추가
2. 트리거 명령어 설정
3. 템플릿 작성
4. 규칙 및 가이드라인 명시

---

*CareMatch Skills v1.1 (HTML Report Generator Added)*
