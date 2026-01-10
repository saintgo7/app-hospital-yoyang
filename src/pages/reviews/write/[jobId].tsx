import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ReviewForm } from '@/components/common/ReviewForm'
import { createServerClient } from '@/lib/supabase'
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

  const supabase = createServerClient()

  // 사용자 정보 조회
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', session.user.email!)
    .single()

  if (!user) {
    return {
      redirect: {
        destination: '/auth/complete-profile',
        permanent: false,
      },
    }
  }

  // 일자리 정보 조회
  const { data: job, error: jobError } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', jobId)
    .eq('status', 'completed')
    .single()

  if (jobError || !job) {
    return { notFound: true }
  }

  // 수락된 지원 조회
  const { data: application } = await supabase
    .from('applications')
    .select(`
      caregiver_id,
      caregiver:users!caregiver_id(id, name, avatar_url)
    `)
    .eq('job_id', jobId)
    .eq('status', 'accepted')
    .single()

  if (!application) {
    return { notFound: true }
  }

  // 권한 확인
  const isGuardian = job.guardian_id === user.id
  const isCaregiver = application.caregiver_id === user.id

  if (!isGuardian && !isCaregiver) {
    return { notFound: true }
  }

  // 리뷰 대상 결정
  let reviewee: Pick<User, 'id' | 'name' | 'avatar_url'>

  if (isGuardian) {
    // 보호자 -> 간병인 리뷰
    reviewee = application.caregiver as Pick<User, 'id' | 'name' | 'avatar_url'>
  } else {
    // 간병인 -> 보호자 리뷰
    const { data: guardian } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', job.guardian_id)
      .single()

    if (!guardian) {
      return { notFound: true }
    }
    reviewee = guardian
  }

  // 이미 작성한 리뷰가 있는지 확인
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('job_id', jobId)
    .eq('reviewer_id', user.id)
    .eq('reviewee_id', reviewee.id)
    .single()

  return {
    props: {
      job,
      reviewee,
      alreadyReviewed: !!existingReview,
    },
  }
}

export default WriteReviewPage
