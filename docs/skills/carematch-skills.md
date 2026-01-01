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

## 📝 스킬 확장

새로운 스킬 추가 시:

1. 이 파일에 스킬 정의 추가
2. 트리거 명령어 설정
3. 템플릿 작성
4. 규칙 및 가이드라인 명시

---

*CareMatch Skills v1.0*
