import { type FC } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/**
 * 헤더 컴포넌트
 * @description 50-70세 사용자를 위한 접근성 최적화 헤더
 */
export const Header: FC = () => {
  const { data: session, status } = useSession()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:h-20">
        {/* 로고 */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-accessible-xl font-bold text-primary">
            케어매치
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/jobs"
            className="text-accessible-base font-medium hover:text-primary transition-colors"
          >
            구인 정보
          </Link>
          <Link
            href="/caregivers"
            className="text-accessible-base font-medium hover:text-primary transition-colors"
          >
            간병인 찾기
          </Link>
        </nav>

        {/* 사용자 영역 */}
        <div className="flex items-center space-x-4">
          {status === 'loading' ? (
            <div className="h-12 w-24 animate-pulse rounded-xl bg-muted" />
          ) : session ? (
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80">
                  <Avatar>
                    <AvatarImage src={session.user?.image || undefined} />
                    <AvatarFallback>
                      {session.user?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-accessible-base font-medium">
                    {session.user?.name}
                  </span>
                </div>
              </Link>
              <Button
                variant="outline"
                size="lg"
                onClick={() => signOut()}
                className="text-accessible-base"
              >
                로그아웃
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link href="/auth/login">
                <Button variant="outline" size="lg" className="text-accessible-base">
                  로그인
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" className="text-accessible-base">
                  회원가입
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
