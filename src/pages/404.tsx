import type { NextPage } from 'next'
import Link from 'next/link'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'

const NotFoundPage: NextPage = () => {
  return (
    <Layout title="페이지를 찾을 수 없습니다">
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          요청하신 페이지를 찾을 수 없습니다.
        </p>
        <Link href="/">
          <Button size="lg">홈으로 돌아가기</Button>
        </Link>
      </div>
    </Layout>
  )
}

export default NotFoundPage
