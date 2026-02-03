import type { NextPage, GetServerSideProps } from 'next'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  statusCode?: number
}

const ErrorPage: NextPage<ErrorProps> = ({ statusCode }) => {
  return (
    <Layout title="오류가 발생했습니다">
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">
          {statusCode ? `${statusCode} 오류` : '오류가 발생했습니다'}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          {statusCode === 404
            ? '요청하신 페이지를 찾을 수 없습니다.'
            : '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'}
        </p>
        <Link href="/">
          <Button size="lg">홈으로 돌아가기</Button>
        </Link>
      </div>
    </Layout>
  )
}

// Use getInitialProps for error pages (special case)
ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default ErrorPage
