import type { NextPage, GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const errorMessages: Record<string, string> = {
  Configuration: '서버 설정 오류가 발생했습니다. 관리자에게 문의해주세요.',
  AccessDenied: '접근이 거부되었습니다.',
  Verification: '인증 링크가 만료되었거나 이미 사용되었습니다.',
  OAuthSignin: '소셜 로그인 시작 중 오류가 발생했습니다.',
  OAuthCallback: '소셜 로그인 처리 중 오류가 발생했습니다.',
  OAuthCreateAccount: '소셜 계정 연결 중 오류가 발생했습니다.',
  EmailCreateAccount: '이메일 계정 생성 중 오류가 발생했습니다.',
  Callback: '로그인 처리 중 오류가 발생했습니다.',
  OAuthAccountNotLinked: '이미 다른 방법으로 가입된 이메일입니다. 기존 방법으로 로그인해주세요.',
  SessionRequired: '로그인이 필요한 페이지입니다.',
  Default: '오류가 발생했습니다. 다시 시도해주세요.',
}

const AuthErrorPage: NextPage = () => {
  const router = useRouter()
  const { error } = router.query
  const errorMessage = errorMessages[error as string] || errorMessages.Default

  return (
    <Layout title="로그인 오류" hideFooter>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader className="space-y-4">
            <div className="text-6xl">😔</div>
            <CardTitle className="text-2xl">문제가 발생했어요</CardTitle>
            <CardDescription className="text-base">
              {errorMessage}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button
              onClick={() => router.push('/auth/login')}
              size="lg"
              className="w-full"
            >
              다시 로그인하기
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              size="lg"
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

// Force SSR to support useRouter
export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  }
}

export default AuthErrorPage
