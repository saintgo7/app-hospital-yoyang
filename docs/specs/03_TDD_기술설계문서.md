# TDD (Technical Design Document)
# CareMatch V3 - 기술 설계 문서

---

## 1. 프로젝트 구조 상세

### 1.1 디렉토리 구조

```
carematch-v3/
├── public/
│   ├── images/
│   │   ├── logo.svg
│   │   └── placeholder-avatar.png
│   └── icons/
├── src/
│   ├── pages/                    # ✅ Pages Router
│   │   ├── _app.tsx
│   │   ├── _document.tsx
│   │   ├── index.tsx
│   │   ├── auth/
│   │   ├── caregiver/
│   │   ├── guardian/
│   │   ├── chat/
│   │   ├── admin/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── layout/
│   │   ├── common/
│   │   ├── caregiver/
│   │   ├── guardian/
│   │   └── chat/
│   ├── lib/
│   ├── hooks/
│   ├── stores/
│   ├── types/
│   ├── constants/
│   └── styles/
├── .env.local
├── next.config.js
├── tailwind.config.js
├── components.json              # shadcn/ui 설정
├── tsconfig.json
└── package.json
```

### 1.2 _app.tsx 설정

```typescript
// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import Layout from '@/components/layout/Layout';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  // 레이아웃 없이 렌더링할 페이지 (로그인 등)
  const getLayout =
    (Component as any).getLayout ||
    ((page: React.ReactNode) => <Layout>{page}</Layout>);

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        {getLayout(<Component {...pageProps} />)}
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### 1.3 _document.tsx 설정

```typescript
// src/pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="믿을 수 있는 간병인 매칭 플랫폼" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

---

## 2. 레이아웃 컴포넌트

### 2.1 메인 레이아웃

```typescript
// src/components/layout/Layout.tsx
import { useSession } from 'next-auth/react';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="flex flex-1">
        {/* 데스크톱 사이드바 */}
        {session && (
          <aside className="hidden lg:block w-64 border-r bg-white">
            <Sidebar userType={session.user.userType} />
          </aside>
        )}
        
        {/* 메인 콘텐츠 */}
        <main className="flex-1 bg-slate-50">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
      
      {/* 모바일 하단 네비게이션 */}
      {session && <MobileNav userType={session.user.userType} />}
    </div>
  );
}
```

### 2.2 헤더 컴포넌트

```typescript
// src/components/layout/Header.tsx
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, MessageCircle, Menu } from 'lucide-react';
import { useUnreadCount } from '@/hooks/useUnreadCount';

export default function Header() {
  const { data: session } = useSession();
  const { chatCount, notificationCount } = useUnreadCount();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/logo.svg" alt="CareMatch" className="h-8" />
            <span className="text-xl font-bold text-primary hidden sm:inline">
              CareMatch
            </span>
          </Link>

          {/* 네비게이션 */}
          {session ? (
            <div className="flex items-center gap-4">
              {/* 채팅 */}
              <Link href="/chat" className="relative">
                <Button variant="ghost" size="icon">
                  <MessageCircle className="h-5 w-5" />
                  {chatCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {chatCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* 알림 */}
              <Link href="/notifications" className="relative">
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* 프로필 드롭다운 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={session.user.image || ''} />
                      <AvatarFallback>
                        {session.user.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={`/${session.user.userType}/profile`}>
                      내 프로필
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/${session.user.userType}/dashboard`}>
                      대시보드
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost">로그인</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>회원가입</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
```

### 2.3 사이드바 컴포넌트

```typescript
// src/components/layout/Sidebar.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Search,
  FileText,
  MessageCircle,
  Star,
  User,
  Building2,
  Users,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  userType: 'caregiver' | 'guardian' | 'admin';
}

const caregiverMenu = [
  { href: '/caregiver/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/caregiver/jobs', icon: Search, label: '일자리 찾기' },
  { href: '/caregiver/applications', icon: FileText, label: '지원 내역' },
  { href: '/chat', icon: MessageCircle, label: '채팅' },
  { href: '/caregiver/reviews', icon: Star, label: '받은 리뷰' },
  { href: '/caregiver/profile', icon: User, label: '내 프로필' },
];

const guardianMenu = [
  { href: '/guardian/dashboard', icon: LayoutDashboard, label: '대시보드' },
  { href: '/guardian/postings', icon: FileText, label: '내 공고' },
  { href: '/guardian/caregivers', icon: Users, label: '간병인 찾기' },
  { href: '/chat', icon: MessageCircle, label: '채팅' },
  { href: '/guardian/profile', icon: User, label: '내 프로필' },
];

const adminMenu = [
  { href: '/admin', icon: LayoutDashboard, label: '대시보드' },
  { href: '/admin/users', icon: Users, label: '사용자 관리' },
  { href: '/admin/postings', icon: FileText, label: '공고 관리' },
  { href: '/admin/certificates', icon: FileText, label: '자격증 심사' },
  { href: '/admin/settings', icon: Settings, label: '설정' },
];

export default function Sidebar({ userType }: SidebarProps) {
  const router = useRouter();
  
  const menu = {
    caregiver: caregiverMenu,
    guardian: guardianMenu,
    admin: adminMenu,
  }[userType];

  return (
    <nav className="py-4">
      <ul className="space-y-1 px-2">
        {menu.map((item) => {
          const isActive = router.pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

---

## 3. 핵심 컴포넌트 설계

### 3.1 구인공고 카드

```typescript
// src/components/common/JobPostingCard.tsx
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Wallet, Calendar, Bookmark } from 'lucide-react';
import { formatSalary, formatRelativeTime } from '@/lib/utils';
import type { JobPosting } from '@/types';

interface JobPostingCardProps {
  posting: JobPosting;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

export function JobPostingCard({
  posting,
  onBookmark,
  isBookmarked,
}: JobPostingCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            {posting.is_urgent && (
              <Badge variant="destructive" className="mb-2">급구</Badge>
            )}
            <Link href={`/caregiver/jobs/${posting.id}`}>
              <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                {posting.title}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground">
              {posting.guardian?.guardian_type === 'facility'
                ? posting.guardian.facility_name
                : '개인'}
            </p>
          </div>
          {onBookmark && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBookmark}
              className={isBookmarked ? 'text-yellow-500' : ''}
            >
              <Bookmark className="h-5 w-5" fill={isBookmarked ? 'currentColor' : 'none'} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {posting.work_location_sido} {posting.work_location_sigungu}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{posting.work_type}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(posting.work_start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-primary">
              {formatSalary(posting.salary_type, posting.salary_amount)}
              {posting.salary_negotiable && ' (협의)'}
            </span>
          </div>
        </div>

        {/* 환자 정보 */}
        {posting.patient && (
          <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
            <span className="font-medium">환자: </span>
            {posting.patient.gender === 'male' ? '남성' : '여성'} ·{' '}
            {posting.patient.birth_year
              ? `${new Date().getFullYear() - posting.patient.birth_year}세`
              : ''}{' '}
            · {posting.patient.diagnosis?.join(', ')}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 justify-between">
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(posting.created_at)}
        </span>
        <Link href={`/caregiver/jobs/${posting.id}`}>
          <Button size="sm">상세보기</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
```

### 3.2 간병인 프로필 카드

```typescript
// src/components/common/CaregiverCard.tsx
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, CheckCircle, MapPin } from 'lucide-react';
import { formatSalary } from '@/lib/utils';
import type { Caregiver } from '@/types';

interface CaregiverCardProps {
  caregiver: Caregiver;
  onContact?: () => void;
}

export function CaregiverCard({ caregiver, onContact }: CaregiverCardProps) {
  const age = caregiver.birth_date
    ? new Date().getFullYear() - new Date(caregiver.birth_date).getFullYear()
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={caregiver.user?.profile_image || ''} />
            <AvatarFallback>
              {caregiver.user?.name?.[0] || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{caregiver.user?.name}</h3>
              {caregiver.is_verified && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  인증
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {caregiver.gender === 'male' ? '남성' : '여성'}
              {age && ` · ${age}세`}
              {caregiver.career_years > 0 && ` · 경력 ${caregiver.career_years}년`}
            </p>
            {caregiver.rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">
                  {caregiver.rating.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({caregiver.review_count})
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        {/* 자격증 */}
        {caregiver.certificates && caregiver.certificates.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {caregiver.certificates
              .filter((c) => c.verification_status === 'approved')
              .map((cert) => (
                <Badge key={cert.id} variant="outline">
                  {cert.certificate_type}
                </Badge>
              ))}
          </div>
        )}

        {/* 희망 지역 */}
        {caregiver.preferred_regions && caregiver.preferred_regions.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{caregiver.preferred_regions.slice(0, 3).join(', ')}</span>
          </div>
        )}

        {/* 희망 급여 */}
        {caregiver.preferred_salary_type && caregiver.preferred_salary_min && (
          <div className="text-sm mt-1">
            <span className="text-muted-foreground">희망 급여: </span>
            <span className="font-medium">
              {formatSalary(
                caregiver.preferred_salary_type,
                caregiver.preferred_salary_min
              )}
              {caregiver.preferred_salary_max &&
                ` ~ ${formatSalary(
                  caregiver.preferred_salary_type,
                  caregiver.preferred_salary_max
                )}`}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 gap-2">
        <Link href={`/guardian/caregivers/${caregiver.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            프로필 보기
          </Button>
        </Link>
        {onContact && (
          <Button onClick={onContact} className="flex-1">
            연락하기
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
```

### 3.3 채팅 컴포넌트

```typescript
// src/components/chat/ChatRoom.tsx
import { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowLeft, Loader2 } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { cn, formatTime } from '@/lib/utils';
import type { Message, User } from '@/types';

interface ChatRoomProps {
  roomId: string;
  currentUserId: string;
  otherUser: User;
  onBack?: () => void;
}

export function ChatRoom({
  roomId,
  currentUserId,
  otherUser,
  onBack,
}: ChatRoomProps) {
  const { messages, isLoading, sendMessage, markAsRead } = useChat(roomId);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 스크롤 하단 유지
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 읽음 처리
  useEffect(() => {
    markAsRead();
  }, [roomId, markAsRead]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    
    setIsSending(true);
    try {
      await sendMessage(input);
      setInput('');
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="flex items-center gap-3 p-4 border-b">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar>
          <AvatarImage src={otherUser.profile_image || ''} />
          <AvatarFallback>{otherUser.name?.[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold">{otherUser.name}</h3>
          <p className="text-xs text-muted-foreground">
            {otherUser.user_type === 'caregiver' ? '간병인' : '보호자'}
          </p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-muted-foreground">
            대화를 시작해보세요!
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMine={message.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력창 */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요"
            disabled={isSending}
          />
          <Button onClick={handleSend} disabled={isSending || !input.trim()}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 메시지 버블 컴포넌트
function MessageBubble({
  message,
  isMine,
}: {
  message: Message;
  isMine: boolean;
}) {
  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isMine
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <p className="break-words">{message.content}</p>
        <p
          className={cn(
            'text-xs mt-1',
            isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
```

---

## 4. 상태 관리 (Zustand)

### 4.1 인증 스토어

```typescript
// src/stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  // 추가 사용자 정보 (세션 외)
  profile: any | null;
  isProfileComplete: boolean;
  
  setProfile: (profile: any) => void;
  setProfileComplete: (complete: boolean) => void;
  clearProfile: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      isProfileComplete: false,
      
      setProfile: (profile) => set({ profile }),
      setProfileComplete: (complete) => set({ isProfileComplete: complete }),
      clearProfile: () => set({ profile: null, isProfileComplete: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

### 4.2 검색 필터 스토어

```typescript
// src/stores/useJobFilterStore.ts
import { create } from 'zustand';

interface JobFilters {
  workType: string[];
  sido: string;
  sigungu: string;
  salaryType: string;
  salaryMin: number;
  salaryMax: number;
  sortBy: 'latest' | 'salary' | 'deadline';
}

interface JobFilterState {
  filters: JobFilters;
  setFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  setFilters: (filters: Partial<JobFilters>) => void;
  resetFilters: () => void;
}

const initialFilters: JobFilters = {
  workType: [],
  sido: '',
  sigungu: '',
  salaryType: '',
  salaryMin: 0,
  salaryMax: 0,
  sortBy: 'latest',
};

export const useJobFilterStore = create<JobFilterState>((set) => ({
  filters: initialFilters,
  
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
    
  setFilters: (newFilters) =>
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    })),
    
  resetFilters: () => set({ filters: initialFilters }),
}));
```

---

## 5. 커스텀 훅

### 5.1 채팅 훅

```typescript
// src/hooks/useChat.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types';

export function useChat(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 초기 메시지 로드
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender:users(id, name, profile_image)')
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data);
      }
      
      setIsLoading(false);
    };

    loadMessages();
  }, [roomId]);

  // 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_room_id=eq.${roomId}`,
        },
        async (payload) => {
          // sender 정보 가져오기
          const { data: sender } = await supabase
            .from('users')
            .select('id, name, profile_image')
            .eq('id', payload.new.sender_id)
            .single();

          const newMessage = { ...payload.new, sender } as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 메시지 전송
  const sendMessage = useCallback(
    async (content: string) => {
      const { error } = await supabase.from('messages').insert({
        chat_room_id: roomId,
        content,
        message_type: 'text',
      });

      if (error) throw error;

      // 채팅방 마지막 메시지 업데이트
      await supabase
        .from('chat_rooms')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', roomId);
    },
    [roomId]
  );

  // 읽음 처리
  const markAsRead = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (!session) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_room_id', roomId)
      .neq('sender_id', session.user.id)
      .eq('is_read', false);
  }, [roomId]);

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
  };
}
```

### 5.2 구인공고 훅

```typescript
// src/hooks/useJobs.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useJobFilterStore } from '@/stores/useJobFilterStore';

interface UseJobsOptions {
  page?: number;
  limit?: number;
}

export function useJobs(options: UseJobsOptions = {}) {
  const { page = 1, limit = 20 } = options;
  const { filters } = useJobFilterStore();

  return useQuery({
    queryKey: ['jobs', filters, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: filters.sortBy,
      });

      if (filters.workType.length > 0) {
        params.set('workType', filters.workType.join(','));
      }
      if (filters.sido) params.set('sido', filters.sido);
      if (filters.sigungu) params.set('sigungu', filters.sigungu);
      if (filters.salaryType) params.set('salaryType', filters.salaryType);
      if (filters.salaryMin > 0) params.set('salaryMin', String(filters.salaryMin));

      const response = await fetch(`/api/jobs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch jobs');
      
      return response.json();
    },
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) throw new Error('Failed to fetch job');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useApplyJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      coverLetter,
    }: {
      jobId: string;
      coverLetter?: string;
    }) => {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverLetter }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply');
      }

      return response.json();
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}
```

---

## 6. API 구현 (Pages Router)

### 6.1 구인공고 목록 API

```typescript
// src/pages/api/jobs/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  
  if (req.method === 'POST') {
    return withAuth(handlePost)(req, res);
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      page = '1',
      limit = '20',
      workType,
      sido,
      sigungu,
      salaryType,
      salaryMin,
      sortBy = 'latest',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabaseAdmin
      .from('job_postings')
      .select(
        `
        *,
        guardian:guardians(id, guardian_type, facility_name, user:users(name)),
        patient:patients(gender, birth_year, diagnosis, mobility_level)
      `,
        { count: 'exact' }
      )
      .eq('status', 'active');

    // 필터 적용
    if (workType) {
      const types = (workType as string).split(',');
      query = query.in('work_type', types);
    }
    if (sido) query = query.eq('work_location_sido', sido);
    if (sigungu) query = query.eq('work_location_sigungu', sigungu);
    if (salaryType) query = query.eq('salary_type', salaryType);
    if (salaryMin) query = query.gte('salary_amount', parseInt(salaryMin as string));

    // 정렬
    switch (sortBy) {
      case 'salary':
        query = query.order('salary_amount', { ascending: false });
        break;
      case 'deadline':
        query = query.order('expires_at', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // 페이지네이션
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count,
        totalPages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Jobs GET error:', error);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  try {
    // 보호자 확인
    const { data: guardian } = await supabaseAdmin
      .from('guardians')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (!guardian) {
      return res.status(403).json({
        success: false,
        error: 'Guardian profile required',
      });
    }

    const body = req.body;

    const { data, error } = await supabaseAdmin
      .from('job_postings')
      .insert({
        guardian_id: guardian.id,
        ...body,
        status: 'active',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Jobs POST error:', error);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
}
```

### 6.2 지원하기 API

```typescript
// src/pages/api/jobs/[id]/apply.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import { sendAlimtalk, ALIMTALK_TEMPLATES } from '@/lib/kakao/alimtalk';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { id: jobId } = req.query;
    const { coverLetter } = req.body;

    // 간병인 확인
    const { data: caregiver } = await supabaseAdmin
      .from('caregivers')
      .select('id, is_verified, user:users(name, phone)')
      .eq('user_id', session.user.id)
      .single();

    if (!caregiver) {
      return res.status(403).json({
        success: false,
        error: 'Caregiver profile required',
      });
    }

    if (!caregiver.is_verified) {
      return res.status(403).json({
        success: false,
        error: 'Profile verification required',
      });
    }

    // 중복 지원 체크
    const { data: existing } = await supabaseAdmin
      .from('applications')
      .select('id')
      .eq('job_posting_id', jobId)
      .eq('caregiver_id', caregiver.id)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Already applied',
      });
    }

    // 공고 정보 조회
    const { data: job } = await supabaseAdmin
      .from('job_postings')
      .select('id, title, guardian:guardians(user:users(phone))')
      .eq('id', jobId)
      .single();

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    // 지원 생성
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .insert({
        job_posting_id: jobId,
        caregiver_id: caregiver.id,
        cover_letter: coverLetter,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // 지원자 수 증가
    await supabaseAdmin.rpc('increment_application_count', {
      posting_id: jobId,
    });

    // 보호자에게 알림톡 (비동기)
    const guardianPhone = job.guardian?.user?.phone;
    if (guardianPhone) {
      sendAlimtalk({
        templateCode: ALIMTALK_TEMPLATES.APPLICATION_RECEIVED,
        recipientPhone: guardianPhone,
        variables: {
          jobTitle: job.title,
          caregiverName: caregiver.user?.name || '간병인',
        },
      }).catch(console.error);
    }

    return res.status(201).json({
      success: true,
      data: {
        applicationId: application.id,
        status: 'pending',
        appliedAt: application.applied_at,
      },
    });
  } catch (error) {
    console.error('Apply error:', error);
    return res.status(500).json({ success: false, error: 'SERVER_ERROR' });
  }
}

export default withAuth(handler);
```

---

## 7. 페이지 구현 (Pages Router)

### 7.1 구인공고 목록 페이지

```typescript
// src/pages/caregiver/jobs/index.tsx
import { useState } from 'react';
import Head from 'next/head';
import { useJobs } from '@/hooks/useJobs';
import { JobPostingCard } from '@/components/common/JobPostingCard';
import { JobFilter } from '@/components/caregiver/JobFilter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Filter, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export default function JobsPage() {
  const [page, setPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const { data, isLoading, error } = useJobs({ page, limit: 20 });

  return (
    <>
      <Head>
        <title>일자리 찾기 | CareMatch</title>
      </Head>

      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">일자리 찾기</h1>
          
          {/* 모바일 필터 버튼 */}
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <Filter className="h-4 w-4 mr-2" />
                필터
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>검색 필터</SheetTitle>
              </SheetHeader>
              <JobFilter onApply={() => setIsFilterOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex gap-6">
          {/* 데스크톱 필터 사이드바 */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-20 bg-white rounded-lg border p-4">
              <h2 className="font-semibold mb-4">검색 필터</h2>
              <JobFilter />
            </div>
          </aside>

          {/* 공고 목록 */}
          <div className="flex-1 space-y-4">
            {/* 결과 개수 */}
            {data && (
              <p className="text-sm text-muted-foreground">
                총 {data.pagination.total}개의 공고
              </p>
            )}

            {/* 로딩 상태 */}
            {isLoading && (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-48 w-full" />
                ))}
              </div>
            )}

            {/* 에러 상태 */}
            {error && (
              <div className="text-center py-8 text-muted-foreground">
                공고를 불러오는 중 오류가 발생했습니다.
              </div>
            )}

            {/* 공고 목록 */}
            {data?.data && data.data.length > 0 ? (
              <div className="space-y-4">
                {data.data.map((posting: any) => (
                  <JobPostingCard key={posting.id} posting={posting} />
                ))}
              </div>
            ) : (
              !isLoading && (
                <div className="text-center py-8 text-muted-foreground">
                  조건에 맞는 공고가 없습니다.
                </div>
              )
            )}

            {/* 페이지네이션 */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  이전
                </Button>
                <span className="flex items-center px-4">
                  {page} / {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                >
                  다음
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// 인증 필요
JobsPage.auth = true;
```

### 7.2 로그인 페이지

```typescript
// src/pages/auth/login.tsx
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<'kakao' | 'naver' | null>(null);
  const callbackUrl = (router.query.callbackUrl as string) || '/';

  const handleSocialLogin = async (provider: 'kakao' | 'naver') => {
    setIsLoading(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(null);
    }
  };

  return (
    <>
      <Head>
        <title>로그인 | CareMatch</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img
              src="/images/logo.svg"
              alt="CareMatch"
              className="h-12 mx-auto mb-4"
            />
            <CardTitle className="text-2xl">로그인</CardTitle>
            <p className="text-muted-foreground">
              CareMatch에 오신 것을 환영합니다
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 카카오 로그인 */}
            <Button
              variant="outline"
              className="w-full h-12 bg-[#FEE500] hover:bg-[#FEE500]/90 text-black border-none"
              onClick={() => handleSocialLogin('kakao')}
              disabled={isLoading !== null}
            >
              {isLoading === 'kakao' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <img
                    src="/icons/kakao.svg"
                    alt=""
                    className="h-5 w-5 mr-2"
                  />
                  카카오로 시작하기
                </>
              )}
            </Button>

            {/* 네이버 로그인 */}
            <Button
              variant="outline"
              className="w-full h-12 bg-[#03C75A] hover:bg-[#03C75A]/90 text-white border-none"
              onClick={() => handleSocialLogin('naver')}
              disabled={isLoading !== null}
            >
              {isLoading === 'naver' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <img
                    src="/icons/naver.svg"
                    alt=""
                    className="h-5 w-5 mr-2"
                  />
                  네이버로 시작하기
                </>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  또는
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              아직 회원이 아니신가요?{' '}
              <Link href="/auth/signup" className="text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// 레이아웃 없이 렌더링
LoginPage.getLayout = (page: React.ReactNode) => page;
```

---

## 8. 환경 설정 파일

### 8.1 next.config.js

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'localhost',
      '*.supabase.co',
      'k.kakaocdn.net',
      'ssl.pstatic.net',
    ],
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

### 8.2 tailwind.config.js

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontSize: {
        // 50-70대 사용자를 위한 기본 폰트 크기
        base: ['18px', '28px'],
        sm: ['16px', '24px'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

---

## 9. Claude Code 실행 명령어

```bash
# 1. 프로젝트 생성 (Pages Router)
npx create-next-app@14.2.35 carematch-v3 --typescript --tailwind --eslint --no-app --src-dir

# 2. 디렉토리 이동
cd carematch-v3

# 3. 의존성 설치
npm install @supabase/supabase-js
npm install next-auth@4
npm install zustand @tanstack/react-query
npm install lucide-react date-fns
npm install zod react-hook-form @hookform/resolvers
npm install clsx tailwind-merge tailwindcss-animate

# 4. shadcn/ui 초기화
npx shadcn-ui@latest init

# 선택 옵션:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - tailwind.config.js location: tailwind.config.js
# - components.json location: components.json
# - Components: @/components
# - Utils: @/lib/utils

# 5. shadcn/ui 컴포넌트 설치
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add separator
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add popover
npx shadcn-ui@latest add form
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add radio-group
npx shadcn-ui@latest add slider

# 6. 환경변수 파일 생성
cp .env.example .env.local
# 환경변수 값 입력

# 7. 개발 서버 실행
npm run dev
```

---

## 10. 배포 체크리스트

### 개발 완료 체크
- [ ] 모든 API 엔드포인트 테스트 완료
- [ ] getServerSideProps 필요 페이지 확인
- [ ] 반응형 UI 테스트 (모바일/태블릿/데스크톱)
- [ ] 브라우저 호환성 테스트
- [ ] Lighthouse 점수 90+ 확인

### 보안 체크
- [ ] 환경 변수 설정 완료 (Vercel)
- [ ] NextAuth.js SECRET 설정
- [ ] Supabase RLS 정책 적용
- [ ] API Rate Limiting 설정

### 운영 체크
- [ ] 도메인 연결
- [ ] Vercel Analytics 설정
- [ ] Sentry 에러 로깅 설정
- [ ] 카카오/네이버 OAuth 프로덕션 설정
- [ ] 알림톡 템플릿 승인
