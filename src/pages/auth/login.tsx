import type { NextPage } from 'next'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const LoginPage: NextPage = () => {
  const router = useRouter()
  const { callbackUrl, error } = router.query

  const handleKakaoLogin = () => {
    signIn('kakao', {
      callbackUrl: (callbackUrl as string) || '/dashboard',
    })
  }

  const handleNaverLogin = () => {
    signIn('naver', {
      callbackUrl: (callbackUrl as string) || '/dashboard',
    })
  }

  return (
    <Layout title="로그인" hideFooter>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-accessible-2xl">로그인</CardTitle>
            <CardDescription className="text-accessible-base">
              케어매치에 오신 것을 환영합니다
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-accessible-base text-center">
                {error === 'OAuthAccountNotLinked'
                  ? '이미 다른 방법으로 가입된 이메일입니다.'
                  : '로그인 중 오류가 발생했습니다. 다시 시도해주세요.'}
              </div>
            )}

            <div className="space-y-4">
              <Button
                onClick={handleKakaoLogin}
                size="xl"
                className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.833 1.857 5.315 4.656 6.745-.147.544-.535 1.975-.613 2.283-.097.385.141.38.297.277.123-.081 1.956-1.327 2.755-1.87.602.088 1.223.134 1.856.134 5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
                </svg>
                카카오로 로그인
              </Button>

              <Button
                onClick={handleNaverLogin}
                size="xl"
                className="w-full bg-[#03C75A] hover:bg-[#02b350] text-white font-bold gap-3"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                </svg>
                네이버로 로그인
              </Button>
            </div>

            <div className="text-center text-accessible-base text-muted-foreground">
              <p>
                아직 계정이 없으신가요?{' '}
                <button
                  onClick={() => router.push('/auth/register')}
                  className="text-primary hover:underline font-medium"
                >
                  회원가입
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default LoginPage
