import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReviewForm } from '@/components/common/ReviewForm'
import type { JobPosting, User } from '@/types/database.types'

interface Props {
  job: JobPosting
  reviewee: Pick<User, 'id' | 'name' | 'avatar_url'>
  alreadyReviewed: boolean
}

const WriteReviewPage: NextPage<Props> = ({ job, reviewee, alreadyReviewed }) => {
  const router = useRouter()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (data: { rating: number; comment: string }) => {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId: job.id,
        revieweeId: reviewee.id,
        rating: data.rating,
        comment: data.comment,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '리뷰 작성에 실패했습니다.')
    }

    setSubmitted(true)
  }

  if (alreadyReviewed) {
    return (
      <Layout title="리뷰 작성">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[v]</div>
              <h2 className="text-xl font-bold mb-4">
                이미 리뷰를 작성하셨습니다
              </h2>
              <p className="text-base text-muted-foreground mb-6">
                이 일자리에 대해 이미 리뷰를 작성하셨습니다.
              </p>
              <Button
                variant="guardian"
                size="lg"
                onClick={() => router.push('/reviews')}
              >
                내 리뷰 보기
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  if (submitted) {
    return (
      <Layout title="리뷰 작성 완료">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[v]</div>
              <h2 className="text-xl font-bold mb-4">
                리뷰가 작성되었습니다
              </h2>
              <p className="text-base text-muted-foreground mb-6">
                소중한 리뷰 감사합니다. 작성하신 리뷰는 다른 사용자에게 큰 도움이 됩니다.
              </p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => router.push('/reviews')}
                >
                  내 리뷰 보기
                </Button>
                <Button
                  variant="guardian"
                  size="lg"
                  onClick={() => router.back()}
                >
                  돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`리뷰 작성 - ${job.title}`}>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* 일자리 정보 */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">
              완료된 일자리
            </p>
            <h2 className="text-lg font-bold">{job.title}</h2>
            <p className="text-base text-muted-foreground mt-1">
              [L] {job.location}
            </p>
          </CardContent>
        </Card>

        {/* 리뷰 작성 폼 */}
        <ReviewForm
          jobId={job.id}
          revieweeId={reviewee.id}
          revieweeName={reviewee.name}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { jobId } = context.params as { jobId: string }
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    // API 라우트를 통해 리뷰 작성 정보 조회
    const response = await fetch(`${baseUrl}/api/reviews/write/${jobId}`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    })

    if (!response.ok) {
      if (response.status === 404 || response.status === 403) {
        return { notFound: true }
      }
      throw new Error('Failed to fetch review write data')
    }

    const data = await response.json()

    return {
      props: {
        job: data.job,
        reviewee: data.reviewee,
        alreadyReviewed: data.alreadyReviewed,
      },
    }
  } catch (error) {
    console.error('Error fetching review write data:', error)
    return { notFound: true }
  }
}

export default WriteReviewPage
