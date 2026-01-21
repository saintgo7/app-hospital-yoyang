import type { NextPage, GetServerSideProps } from 'next'
import { useRouter } from 'next/router'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const LoginPage: NextPage = () => {
  const router = useRouter()

  return (
    <Layout title="로그인" hideFooter>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <CardTitle>로그인</CardTitle>
            <CardDescription>
              케어매치에 오신 것을 환영합니다
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🚧</div>
              <p className="text-lg text-muted-foreground mb-2">
                로그인 기능 준비중입니다
              </p>
              <p className="text-sm text-muted-foreground">
                빠른 시일 내에 서비스를 제공하겠습니다
              </p>
            </div>

            <Button
              onClick={() => router.push('/')}
              size="lg"
              className="w-full"
              variant="outline"
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

export default LoginPage
