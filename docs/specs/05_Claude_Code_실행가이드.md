# CareMatch V3 - Claude Code 실행 가이드

## 📋 개요

이 가이드는 CareMatch V3 프로젝트를 Claude Code로 구현하기 위한 단계별 실행 프롬프트입니다.
Pages Router 아키텍처 기반으로 설계되었으며, 각 단계별로 복사하여 실행하세요.

---

## 🚀 Phase 1: 프로젝트 초기화 (Day 1-2)

### Step 1.1: 프로젝트 생성 및 기본 설정

```
CareMatch V3 프로젝트를 초기화해줘.

요구사항:
1. Next.js 14.2.35 + Pages Router로 생성
2. TypeScript, Tailwind CSS, ESLint 포함
3. src 디렉토리 사용

실행 명령어:
npx create-next-app@14.2.35 carematch-v3 --typescript --tailwind --eslint --no-app --src-dir

생성 후:
- cd carematch-v3
- 기본 구조 확인
```

### Step 1.2: 의존성 설치

```
다음 패키지들을 설치해줘:

Core:
npm install @supabase/supabase-js@2 next-auth@4 zustand@4 @tanstack/react-query@5

UI:
npm install lucide-react date-fns zod react-hook-form @hookform/resolvers
npm install clsx tailwind-merge tailwindcss-animate class-variance-authority

shadcn/ui 초기화:
npx shadcn-ui@latest init

컴포넌트 추가:
npx shadcn-ui@latest add button card input label select textarea dialog sheet tabs avatar badge separator dropdown-menu popover form toast skeleton alert checkbox radio-group slider scroll-area
```

### Step 1.3: 환경 변수 설정

```
.env.local 파일을 생성해줘:

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Kakao OAuth
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret

# Naver OAuth
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# Kakao Alimtalk
KAKAO_ALIMTALK_API_KEY=your_alimtalk_key
KAKAO_SENDER_KEY=your_sender_key
```

---

## 🏗️ Phase 2: 기본 구조 설정 (Day 2-3)

### Step 2.1: 디렉토리 구조 생성

```
다음 디렉토리 구조를 생성해줘:

src/
├── pages/
│   ├── _app.tsx
│   ├── _document.tsx
│   ├── index.tsx
│   ├── auth/
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── complete-profile.tsx
│   ├── caregiver/
│   │   ├── dashboard.tsx
│   │   ├── jobs/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── applications.tsx
│   │   └── profile.tsx
│   ├── guardian/
│   │   ├── dashboard.tsx
│   │   ├── postings/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx
│   │   │   └── [id]/
│   │   │       ├── index.tsx
│   │   │       └── edit.tsx
│   │   ├── caregivers/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   └── profile.tsx
│   ├── chat/
│   │   ├── index.tsx
│   │   └── [roomId].tsx
│   ├── admin/
│   │   ├── dashboard.tsx
│   │   ├── users.tsx
│   │   ├── verifications.tsx
│   │   └── reports.tsx
│   └── api/
│       ├── auth/
│       │   └── [...nextauth].ts
│       ├── jobs/
│       ├── caregivers/
│       ├── guardians/
│       ├── applications/
│       ├── chat/
│       └── reviews/
├── components/
│   ├── ui/ (shadcn)
│   ├── layout/
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   ├── common/
│   │   ├── JobPostingCard.tsx
│   │   ├── CaregiverCard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── EmptyState.tsx
│   └── chat/
│       ├── ChatRoom.tsx
│       ├── MessageBubble.tsx
│       └── ChatInput.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── admin.ts
│   ├── auth/
│   │   └── options.ts
│   ├── kakao/
│   │   └── alimtalk.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useChat.ts
│   ├── useJobs.ts
│   └── useNotifications.ts
├── stores/
│   ├── authStore.ts
│   └── filterStore.ts
├── types/
│   ├── database.ts
│   ├── auth.ts
│   └── api.ts
└── styles/
    └── globals.css
```

### Step 2.2: Supabase 클라이언트 설정

```
src/lib/supabase/client.ts 파일을 생성해줘:

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// 서버사이드용 (API Routes)
export const createServerClient = () => {
  return createClient<Database>(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};
```

### Step 2.3: NextAuth 설정

```
src/pages/api/auth/[...nextauth].ts 파일을 생성해줘:

NextAuth.js v4 설정:
- KakaoProvider 설정
- NaverProvider 설정
- Supabase Adapter 연동
- JWT 전략 사용
- 세션에 사용자 타입(userType) 포함
- callbacks: jwt, session 설정
```

### Step 2.4: _app.tsx 설정

```
src/pages/_app.tsx를 생성해줘:

포함 내용:
- SessionProvider (NextAuth)
- QueryClientProvider (React Query)
- Toaster (shadcn/ui)
- getLayout 패턴 지원
- 글로벌 스타일 import
```

### Step 2.5: _document.tsx 설정

```
src/pages/_document.tsx를 생성해줘:

포함 내용:
- 한국어 lang 설정
- 기본 메타 태그
- 웹폰트 (Pretendard) 프리로드
```

---

## 🎨 Phase 3: 레이아웃 컴포넌트 (Day 3-4)

### Step 3.1: Layout 컴포넌트

```
src/components/layout/Layout.tsx를 생성해줘:

요구사항:
- Header, Sidebar, Footer, MobileNav 포함
- 사용자 역할에 따라 다른 사이드바 메뉴 표시
- 모바일 반응형 지원
- children을 main 영역에 렌더링
```

### Step 3.2: Header 컴포넌트

```
src/components/layout/Header.tsx를 생성해줘:

요구사항:
- 로고 (홈 링크)
- 채팅 아이콘 (읽지 않은 메시지 뱃지)
- 알림 아이콘 (읽지 않은 알림 뱃지)
- 사용자 드롭다운 메뉴 (프로필, 설정, 로그아웃)
- 모바일에서 햄버거 메뉴
```

### Step 3.3: Sidebar 컴포넌트

```
src/components/layout/Sidebar.tsx를 생성해줘:

요구사항:
- 역할별 메뉴 분기:
  - caregiver: 대시보드, 일자리 찾기, 지원 현황, 내 프로필, 채팅
  - guardian: 대시보드, 공고 관리, 간병인 찾기, 내 프로필, 채팅
  - admin: 대시보드, 사용자 관리, 인증 관리, 신고 관리, 통계
- 현재 페이지 활성화 표시
- 아이콘 사용 (lucide-react)
```

### Step 3.4: MobileNav 컴포넌트

```
src/components/layout/MobileNav.tsx를 생성해줘:

요구사항:
- 하단 고정 네비게이션 바
- 5개 메뉴 아이콘 (홈, 검색, 채팅, 알림, 프로필)
- 역할에 따라 검색 대상 변경 (일자리/간병인)
- 활성 상태 표시
```

---

## 🔐 Phase 4: 인증 시스템 (Day 4-5)

### Step 4.1: 로그인 페이지

```
src/pages/auth/login.tsx를 생성해줘:

요구사항:
- 카카오 로그인 버튼
- 네이버 로그인 버튼
- 소셜 로그인 전용 (이메일 로그인 없음)
- 레이아웃 없이 단독 페이지
- 로그인 후 callback URL로 리다이렉트
- 타겟 사용자(50-70세) 고려한 큰 버튼
```

### Step 4.2: 회원가입 페이지

```
src/pages/auth/signup.tsx를 생성해줘:

요구사항:
- 사용자 유형 선택 (간병인/보호자)
- 소셜 로그인으로 연결
- 약관 동의 체크박스
- 마케팅 수신 동의 (선택)
```

### Step 4.3: 프로필 완성 페이지

```
src/pages/auth/complete-profile.tsx를 생성해줘:

요구사항:
- 최초 로그인 후 프로필 완성 유도
- 간병인: 이름, 연락처, 경력, 자격증, 희망 근무조건
- 보호자: 이름, 연락처, 환자 정보 기본 등록
- 단계별 폼 (Step 1, 2, 3...)
- 건너뛰기 가능 (나중에 설정)
```

### Step 4.4: 인증 미들웨어

```
src/lib/auth/middleware.ts를 생성해줘:

포함 함수:
- withAuth(): 로그인 필수 API용 HOC
- withRole(roles): 역할 기반 접근 제어
- getServerSession(): 서버사이드 세션 조회
```

---

## 📝 Phase 5: 공통 컴포넌트 (Day 5-6)

### Step 5.1: JobPostingCard 컴포넌트

```
src/components/common/JobPostingCard.tsx를 생성해줘:

Props:
- job: JobPosting 타입
- onBookmark?: () => void
- showBookmark?: boolean

표시 정보:
- 제목, 근무 유형 뱃지
- 위치, 급여
- 환자 정보 요약 (나이, 성별, 질환)
- 등록일, 마감일
- 북마크 버튼
- 클릭 시 상세 페이지 이동
```

### Step 5.2: CaregiverCard 컴포넌트

```
src/components/common/CaregiverCard.tsx를 생성해줘:

Props:
- caregiver: Caregiver 타입
- onContact?: () => void
- showContact?: boolean

표시 정보:
- 프로필 이미지, 이름
- 별점, 리뷰 수
- 경력 연수
- 자격증 뱃지들
- 희망 근무 유형, 지역
- 자기소개 (2줄 요약)
- 연락하기 버튼
```

### Step 5.3: EmptyState 컴포넌트

```
src/components/common/EmptyState.tsx를 생성해줘:

Props:
- icon?: LucideIcon
- title: string
- description?: string
- action?: { label: string; onClick: () => void }

용도:
- 검색 결과 없음
- 지원 내역 없음
- 공고 없음 등
```

### Step 5.4: LoadingSpinner 컴포넌트

```
src/components/common/LoadingSpinner.tsx를 생성해줘:

Props:
- size?: 'sm' | 'md' | 'lg'
- className?: string

전체 페이지 로딩용 variant도 포함
```

---

## 💼 Phase 6: 간병인 페이지 (Day 6-8)

### Step 6.1: 간병인 대시보드

```
src/pages/caregiver/dashboard.tsx를 생성해줘:

표시 내용:
- 환영 메시지 (이름 포함)
- 통계 카드: 지원 현황, 진행 중 매칭, 완료 건수
- 최근 알림 목록
- 추천 일자리 목록 (최대 5개)
- 빠른 액션 버튼 (일자리 찾기, 프로필 수정)

데이터 fetching:
- getServerSideProps로 초기 데이터 로드
- React Query로 클라이언트 캐싱
```

### Step 6.2: 일자리 목록 페이지

```
src/pages/caregiver/jobs/index.tsx를 생성해줘:

기능:
- 필터 사이드바 (데스크톱) / 필터 Sheet (모바일)
  - 근무 유형: 입주, 출퇴근, 시간제
  - 지역: 시/도, 구/군
  - 급여 범위: 슬라이더
  - 정렬: 최신순, 급여순, 거리순
- JobPostingCard 그리드 (2열 / 모바일 1열)
- 무한 스크롤 또는 페이지네이션
- 검색 바

상태 관리:
- Zustand: 필터 상태
- React Query: 일자리 목록
```

### Step 6.3: 일자리 상세 페이지

```
src/pages/caregiver/jobs/[id].tsx를 생성해줘:

표시 내용:
- 공고 제목, 상태 뱃지
- 보호자 프로필 요약
- 근무 조건 상세 (유형, 시간, 급여)
- 환자 정보 상세 (나이, 성별, 질환, 거동 상태, 특이사항)
- 요구 사항 (자격증, 경력)
- 위치 정보 (지도 표시는 선택)
- 지원하기 버튼
- 북마크 버튼
- 채팅 문의 버튼

데이터:
- getServerSideProps로 공고 상세 로드
```

### Step 6.4: 지원 현황 페이지

```
src/pages/caregiver/applications.tsx를 생성해줘:

기능:
- 탭 분류: 전체, 대기중, 수락됨, 거절됨
- 지원 카드 목록:
  - 공고 제목
  - 지원일
  - 상태 뱃지
  - 보호자 연락처 (수락된 경우)
- 지원 취소 기능 (대기중인 경우)
- 빈 상태 처리
```

### Step 6.5: 간병인 프로필 페이지

```
src/pages/caregiver/profile.tsx를 생성해줘:

섹션:
1. 기본 정보: 프로필 사진, 이름, 연락처
2. 자격 정보: 자격증 목록 (인증 상태 표시)
3. 경력 정보: 경력 연수, 이전 근무 이력
4. 희망 조건: 근무 유형, 지역, 급여
5. 자기소개: 텍스트
6. 리뷰 및 평점

편집:
- 각 섹션별 편집 버튼
- Dialog로 편집 폼 표시
- 실시간 저장 피드백
```

---

## 👨‍👩‍👧 Phase 7: 보호자 페이지 (Day 8-10)

### Step 7.1: 보호자 대시보드

```
src/pages/guardian/dashboard.tsx를 생성해줘:

표시 내용:
- 환영 메시지
- 통계 카드: 활성 공고, 받은 지원, 진행 중 매칭
- 최근 알림 목록
- 내 공고 현황 요약
- 빠른 액션 (새 공고 등록, 간병인 찾기)
```

### Step 7.2: 공고 관리 페이지

```
src/pages/guardian/postings/index.tsx를 생성해줘:

기능:
- 탭: 전체, 활성, 마감, 완료
- 공고 카드 목록:
  - 제목, 상태
  - 지원자 수
  - 등록일, 마감일
  - 액션: 수정, 마감, 삭제
- 새 공고 등록 버튼
```

### Step 7.3: 공고 등록 페이지

```
src/pages/guardian/postings/new.tsx를 생성해줘:

폼 구성 (단계별):
Step 1 - 기본 정보:
  - 공고 제목
  - 근무 유형 선택
  - 근무 시간

Step 2 - 급여 조건:
  - 급여 형태 (월급/일급/시급)
  - 금액 입력
  - 식비/교통비 포함 여부

Step 3 - 환자 정보:
  - 기존 환자 선택 또는 새로 등록
  - 나이, 성별, 주요 질환
  - 거동 상태, 특이사항

Step 4 - 요구 사항:
  - 필수 자격증
  - 최소 경력
  - 기타 요구사항

Step 5 - 확인 및 등록:
  - 입력 내용 미리보기
  - 등록 버튼

유효성 검사: Zod + react-hook-form
```

### Step 7.4: 공고 상세/지원자 관리

```
src/pages/guardian/postings/[id]/index.tsx를 생성해줘:

표시 내용:
- 공고 상세 정보
- 지원자 목록:
  - CaregiverCard 형태
  - 수락/거절 버튼
  - 프로필 상세 보기
- 채팅 시작 버튼

기능:
- 지원 수락 → 매칭 생성, 알림톡 발송
- 지원 거절 → 상태 업데이트, 알림톡 발송
```

### Step 7.5: 간병인 찾기 페이지

```
src/pages/guardian/caregivers/index.tsx를 생성해줘:

기능:
- 필터:
  - 지역
  - 자격증 종류
  - 경력 범위
  - 평점
- CaregiverCard 그리드
- 정렬: 평점순, 경력순, 최근 활동순
- 검색 바
```

---

## 💬 Phase 8: 채팅 시스템 (Day 10-12)

### Step 8.1: 채팅 목록 페이지

```
src/pages/chat/index.tsx를 생성해줘:

표시:
- 채팅방 목록
- 각 채팅방:
  - 상대방 프로필 이미지, 이름
  - 마지막 메시지 미리보기
  - 시간
  - 읽지 않은 메시지 뱃지
- 빈 상태 처리
```

### Step 8.2: 채팅방 페이지

```
src/pages/chat/[roomId].tsx를 생성해줘:

기능:
- 메시지 목록 (내 메시지/상대 메시지 구분)
- 실시간 메시지 수신 (Supabase Realtime)
- 메시지 입력 및 전송
- 파일 첨부 (이미지)
- 상대방 프로필 확인 버튼
- 관련 공고 정보 표시
```

### Step 8.3: ChatRoom 컴포넌트

```
src/components/chat/ChatRoom.tsx를 생성해줘:

기능:
- 메시지 목록 렌더링
- 자동 스크롤 (새 메시지)
- 날짜 구분선
- 읽음 표시
- 메시지 입력 폼

useChat 훅 사용:
- Supabase Realtime 구독
- 메시지 전송
- 읽음 처리
```

### Step 8.4: useChat 훅

```
src/hooks/useChat.ts를 생성해줘:

기능:
- roomId로 메시지 초기 로드
- Supabase Realtime 구독 설정
- 새 메시지 수신 시 상태 업데이트
- sendMessage(content) 함수
- markAsRead() 함수
- 언마운트 시 구독 해제

반환:
{ messages, isLoading, sendMessage, markAsRead }
```

---

## 🔌 Phase 9: API Routes (Day 12-14)

### Step 9.1: 일자리 API

```
src/pages/api/jobs/ 폴더의 API들을 생성해줘:

GET /api/jobs
  - 필터: workType, location, minSalary, maxSalary
  - 페이지네이션: page, limit
  - 정렬: sortBy (latest, salary, distance)

POST /api/jobs
  - 새 공고 등록 (보호자 전용)
  - 유효성 검사

GET /api/jobs/[id]
  - 공고 상세 조회

PATCH /api/jobs/[id]
  - 공고 수정 (작성자 전용)

DELETE /api/jobs/[id]
  - 공고 삭제 (작성자 전용)

POST /api/jobs/[id]/apply
  - 지원하기 (간병인 전용)
  - 중복 지원 방지
  - 알림톡 발송
```

### Step 9.2: 지원 API

```
src/pages/api/applications/ 폴더의 API들을 생성해줘:

GET /api/applications
  - 내 지원 목록 (간병인)
  - 받은 지원 목록 (보호자)
  - 필터: status

PATCH /api/applications/[id]
  - 지원 상태 변경 (수락/거절)
  - 알림톡 발송

DELETE /api/applications/[id]
  - 지원 취소 (대기중만 가능)
```

### Step 9.3: 채팅 API

```
src/pages/api/chat/ 폴더의 API들을 생성해줘:

GET /api/chat/rooms
  - 내 채팅방 목록

POST /api/chat/rooms
  - 새 채팅방 생성

GET /api/chat/rooms/[roomId]/messages
  - 메시지 목록 (페이지네이션)

POST /api/chat/rooms/[roomId]/messages
  - 메시지 전송
  - 알림톡 발송 (오프라인 상대에게)

PATCH /api/chat/rooms/[roomId]/read
  - 읽음 처리
```

### Step 9.4: 리뷰 API

```
src/pages/api/reviews/ 폴더의 API들을 생성해줘:

GET /api/reviews
  - 간병인별 리뷰 목록 (caregiverId)
  - 보호자별 작성 리뷰 (guardianId)

POST /api/reviews
  - 리뷰 작성 (매칭 완료 후)
  - 평점 업데이트 트리거

PATCH /api/reviews/[id]
  - 리뷰 수정 (작성자 전용, 7일 이내)

DELETE /api/reviews/[id]
  - 리뷰 삭제 (작성자 전용)
```

---

## 📱 Phase 10: Kakao 알림톡 (Day 14-15)

### Step 10.1: 알림톡 유틸리티

```
src/lib/kakao/alimtalk.ts를 생성해줘:

함수:
- sendAlimtalk(phoneNumber, templateId, variables)

템플릿 ID:
- APPLICATION_RECEIVED: 새 지원 알림
- APPLICATION_ACCEPTED: 지원 수락 알림
- APPLICATION_REJECTED: 지원 거절 알림
- NEW_MESSAGE: 새 메시지 알림
- MATCH_COMPLETED: 매칭 완료 알림
```

### Step 10.2: 알림톡 연동

```
지원 수락 시 알림톡 발송 로직을 추가해줘:

1. applications API에서 상태가 accepted로 변경 시
2. 간병인 휴대폰 번호 조회
3. APPLICATION_ACCEPTED 템플릿으로 알림톡 발송
4. 변수: 간병인 이름, 공고 제목, 보호자 연락처
```

---

## 🛡️ Phase 11: 관리자 기능 (Day 15-16)

### Step 11.1: 관리자 대시보드

```
src/pages/admin/dashboard.tsx를 생성해줘:

통계 표시:
- 총 사용자 수 (간병인/보호자)
- 오늘 가입자 수
- 활성 공고 수
- 진행 중 매칭 수
- 대기 중 인증 요청 수

차트:
- 일별 가입자 추이
- 매칭 성공률
```

### Step 11.2: 자격증 인증 관리

```
src/pages/admin/verifications.tsx를 생성해줘:

기능:
- 인증 대기 목록
- 자격증 이미지 확인
- 승인/거절 버튼
- 거절 사유 입력
- 필터: 상태, 자격증 종류
```

---

## 🧪 Phase 12: 테스트 및 최적화 (Day 16-18)

### Step 12.1: Lighthouse 최적화

```
다음 최적화를 적용해줘:

1. 이미지 최적화:
   - next/image 사용
   - WebP 포맷
   - lazy loading

2. 코드 스플리팅:
   - dynamic import
   - 라우트별 청크

3. 폰트 최적화:
   - next/font 사용
   - preload

4. 메타 태그:
   - SEO 최적화
   - Open Graph
```

### Step 12.2: 접근성 개선

```
50-70세 사용자를 위한 접근성 개선을 적용해줘:

1. 폰트 크기:
   - 기본 18px
   - 버튼 텍스트 16px 이상

2. 터치 영역:
   - 최소 44x44px

3. 색상 대비:
   - WCAG AA 기준 충족

4. 폼 요소:
   - 명확한 레이블
   - 큰 입력 필드
   - 에러 메시지 명확히
```

---

## 🚀 Phase 13: 배포 (Day 18-20)

### Step 13.1: Vercel 배포 설정

```
Vercel 배포를 위한 설정을 해줘:

1. vercel.json 생성
2. 환경 변수 설정 가이드
3. 도메인 연결 가이드
4. Preview/Production 분리
```

### Step 13.2: 배포 체크리스트

```
배포 전 체크리스트:

[ ] 환경 변수 설정 완료
[ ] Supabase 프로덕션 설정
[ ] RLS 정책 적용 확인
[ ] 카카오/네이버 OAuth 프로덕션 키
[ ] 알림톡 템플릿 승인
[ ] 에러 로깅 설정 (Sentry)
[ ] Analytics 설정
[ ] 도메인 SSL 인증서
```

---

## 📚 부록: 자주 사용하는 명령어

### 개발 서버
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

### 타입 체크
```bash
npm run type-check
```

### Lint
```bash
npm run lint
```

### 테스트
```bash
npm run test
```

### Supabase 마이그레이션
```bash
supabase db push
```

---

## 🔗 참고 링크

- [Next.js 14 Pages Router 문서](https://nextjs.org/docs/pages)
- [NextAuth.js 문서](https://next-auth.js.org/)
- [Supabase 문서](https://supabase.com/docs)
- [shadcn/ui 문서](https://ui.shadcn.com/)
- [Kakao 알림톡 API](https://developers.kakao.com/docs/latest/ko/message/rest-api)

---

**문서 버전**: 1.0.0  
**최종 수정**: 2026-01-02  
**작성자**: Claude AI Assistant
