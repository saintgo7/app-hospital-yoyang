import type { NextPage, GetServerSideProps } from 'next'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createServerClient } from '@/lib/supabase'
import type { CaregiverProfile, User } from '@/types/database.types'
import { formatCurrency, getTimeAgo } from '@/lib/utils'

interface Props {
  caregiver: User & { caregiver_profile: CaregiverProfile[] }
  reviews: {
    id: string
    rating: number
    comment: string
    created_at: string
    reviewer: { name: string }
  }[]
  averageRating: number
}

const CaregiverDetailPage: NextPage<Props> = ({ caregiver, reviews, averageRating }) => {
  const router = useRouter()
  const profile = caregiver.caregiver_profile?.[0]

  if (!profile) {
    return (
      <Layout title="간병인 정보">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[error]</div>
              <p className="text-lg text-muted-foreground mb-4">
                간병인 정보를 찾을 수 없습니다.
              </p>
              <Button
                variant="outline"
                size="lg"
                className="mt-4"
                onClick={() => router.back()}
              >
                뒤로가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    )
  }

  const handleContact = async () => {
    const session = await fetch('/api/auth/session').then((r) => r.json())

    if (!session) {
      router.push('/auth/login')
      return
    }

    // TODO: 채팅 시작 또는 지원 기능
    router.push('/chat')
  }

  return (
    <Layout title={`${caregiver.name} 간병인`}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 프로필 헤더 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={caregiver.avatar_url || undefined} />
                <AvatarFallback className="text-3xl">
                  {caregiver.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{caregiver.name}</h1>
                  {profile.is_available && (
                    <Badge variant="caregiver" className="text-base">
                      [active] 구직 중
                    </Badge>
                  )}
                </div>

                {profile.experience_years > 0 && (
                  <p className="text-base text-muted-foreground mb-2">
                    경력 {profile.experience_years}년
                  </p>
                )}

                {profile.location && (
                  <p className="text-base text-muted-foreground">
                  [L] {profile.location}
                  </p>
                )}

                {reviews.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-lg font-bold text-primary">
                      {averageRating.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({reviews.length}명의 리뷰)
                    </span>
                  </div>
                )}
              </div>

              {profile.hourly_rate && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">희망 시급</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(profile.hourly_rate)}
                  </p>
                  <p className="text-sm text-muted-foreground">/시간</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 자격증 및 전문 분야 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {profile.certifications && profile.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">자격증</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((cert) => (
                    <Badge key={cert} variant="caregiver" className="text-base py-2 px-4">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {profile.specializations && profile.specializations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">전문 분야</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((spec) => (
                    <Badge key={spec} variant="outline" className="text-base py-2 px-4">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 자기소개 */}
        {profile.introduction && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">자기소개</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base whitespace-pre-wrap">{profile.introduction}</p>
            </CardContent>
          </Card>
        )}

        {/* 리뷰 */}
        {reviews.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                리뷰 ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold">{review.reviewer.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {renderStars(review.rating)}
                      </Badge>
                      <span className="text-sm text-muted-foreground ml-auto">
                        {getTimeAgo(review.created_at)}
                      </span>
                    </div>
                    <p className="text-base">{review.comment}</p>
                  </div>
                ))}
                {reviews.length > 3 && (
                  <Link href="/reviews">
                    <Button variant="outline" size="lg" className="w-full">
                      전체 리뷰 보기
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 버튼 */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => router.back()}
          >
            뒤로가기
          </Button>
          <Button
            variant="caregiver"
            size="lg"
            className="flex-1"
            onClick={handleContact}
          >
            연락하기
          </Button>
        </div>
      </div>
    </Layout>
  )
}

// 별점 렌더링 헬퍼
function renderStars(rating: number): string {
  return '[star]'.repeat(Math.round(rating))
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { id } = context.params as { id: string }

  const supabase = createServerClient()

  // 간병인 정보 조회
  const { data: caregiver, error } = await supabase
    .from('users')
    .select(`
      *,
      caregiver_profile:caregiver_profiles(*)
    `)
    .eq('id', id)
    .eq('role', 'caregiver')
    .single()

  if (error || !caregiver) {
    return { notFound: true }
  }

  // 리뷰 조회
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer:users!reviewer_id(name)
    `)
    .eq('reviewee_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 평균 평점 계산
  const averageRating =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  return {
    props: {
      caregiver: caregiver as Props['caregiver'],
      reviews: (reviews as Props['reviews']) || [],
      averageRating: Math.round(averageRating * 10) / 10,
    },
  }
}

export default CaregiverDetailPage
