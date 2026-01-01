import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReviewCard, ReviewSummary } from '@/components/common/ReviewCard'
import { createServerClient } from '@/lib/supabase'
import type { Review, User } from '@/types/database.types'

interface ReviewWithRelations extends Review {
  reviewer: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>
  reviewee: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>
  job: { id: string; title: string } | null
}

interface Props {
  receivedReviews: ReviewWithRelations[]
  givenReviews: ReviewWithRelations[]
  averageRating: number
  role: 'caregiver' | 'guardian'
}

type TabType = 'received' | 'given'

const ReviewsPage: NextPage<Props> = ({
  receivedReviews,
  givenReviews,
  averageRating,
  role,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('received')

  const currentReviews = activeTab === 'received' ? receivedReviews : givenReviews

  return (
    <Layout title="리뷰">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-accessible-2xl font-bold mb-2">리뷰</h1>
          <p className="text-accessible-base text-muted-foreground">
            {role === 'caregiver'
              ? '보호자로부터 받은 리뷰와 내가 작성한 리뷰를 확인하세요.'
              : '간병인에게 작성한 리뷰와 받은 리뷰를 확인하세요.'}
          </p>
        </div>

        {/* 평균 평점 */}
        {receivedReviews.length > 0 && (
          <div className="mb-8">
            <ReviewSummary
              averageRating={averageRating}
              totalCount={receivedReviews.length}
            />
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('received')}
            className={`px-6 py-3 rounded-xl text-accessible-base transition-all ${
              activeTab === 'received'
                ? 'bg-primary text-primary-foreground font-bold'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            받은 리뷰 ({receivedReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('given')}
            className={`px-6 py-3 rounded-xl text-accessible-base transition-all ${
              activeTab === 'given'
                ? 'bg-primary text-primary-foreground font-bold'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            작성한 리뷰 ({givenReviews.length})
          </button>
        </div>

        {/* 리뷰 목록 */}
        {currentReviews.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">
                {activeTab === 'received' ? '📭' : '📝'}
              </div>
              <p className="text-accessible-lg text-muted-foreground mb-4">
                {activeTab === 'received'
                  ? '아직 받은 리뷰가 없습니다.'
                  : '아직 작성한 리뷰가 없습니다.'}
              </p>
              {activeTab === 'received' && (
                <p className="text-accessible-base text-muted-foreground">
                  {role === 'caregiver'
                    ? '일자리를 완료하면 보호자로부터 리뷰를 받을 수 있습니다.'
                    : '간병 서비스 이용 후 리뷰를 받을 수 있습니다.'}
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {currentReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                showJob
                showReviewee={activeTab === 'given'}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
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

  // 받은 리뷰
  const { data: receivedReviews } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviewer_id(id, name, avatar_url, role),
      reviewee:users!reviewee_id(id, name, avatar_url, role),
      job:job_postings(id, title)
    `)
    .eq('reviewee_id', user.id)
    .order('created_at', { ascending: false })

  // 작성한 리뷰
  const { data: givenReviews } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviewer_id(id, name, avatar_url, role),
      reviewee:users!reviewee_id(id, name, avatar_url, role),
      job:job_postings(id, title)
    `)
    .eq('reviewer_id', user.id)
    .order('created_at', { ascending: false })

  // 평균 평점 계산
  const averageRating =
    receivedReviews && receivedReviews.length > 0
      ? receivedReviews.reduce((sum, r) => sum + r.rating, 0) / receivedReviews.length
      : 0

  return {
    props: {
      receivedReviews: (receivedReviews as ReviewWithRelations[]) || [],
      givenReviews: (givenReviews as ReviewWithRelations[]) || [],
      averageRating: Math.round(averageRating * 10) / 10,
      role: user.role,
    },
  }
}

export default ReviewsPage
