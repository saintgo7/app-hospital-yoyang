import { type FC } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { getTimeAgo } from '@/lib/utils'
import type { Review, User } from '@/types/database.types'

interface ReviewWithRelations extends Review {
  reviewer: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>
  reviewee: Pick<User, 'id' | 'name' | 'avatar_url' | 'role'>
  job?: { id: string; title: string } | null
}

interface ReviewCardProps {
  review: ReviewWithRelations
  showJob?: boolean
  showReviewee?: boolean
}

export const ReviewCard: FC<ReviewCardProps> = ({
  review,
  showJob = false,
  showReviewee = false,
}) => {
  const roleLabel = review.reviewer.role === 'guardian' ? '보호자' : '간병인'

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* 리뷰어 아바타 */}
          <Avatar className="h-12 w-12">
            <AvatarImage src={review.reviewer.avatar_url || undefined} />
            <AvatarFallback>{review.reviewer.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* 리뷰어 정보 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-accessible-base font-bold truncate">
                {review.reviewer.name}
              </span>
              <Badge variant="outline" className="text-xs shrink-0">
                {roleLabel}
              </Badge>
            </div>

            {/* 리뷰 대상 (옵션) */}
            {showReviewee && (
              <p className="text-accessible-sm text-muted-foreground mb-2">
                {review.reviewee.name}님에게 작성한 리뷰
              </p>
            )}

            {/* 일자리 정보 (옵션) */}
            {showJob && review.job && (
              <p className="text-accessible-sm text-muted-foreground mb-2">
                {review.job.title}
              </p>
            )}

            {/* 별점 */}
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-5 h-5 ${
                    star <= review.rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                    clipRule="evenodd"
                  />
                </svg>
              ))}
              <span className="ml-2 text-accessible-sm text-muted-foreground">
                {review.rating}.0
              </span>
            </div>

            {/* 리뷰 내용 */}
            {review.comment && (
              <p className="text-accessible-base text-foreground whitespace-pre-wrap">
                {review.comment}
              </p>
            )}

            {/* 작성일 */}
            <p className="mt-3 text-accessible-sm text-muted-foreground">
              {getTimeAgo(review.created_at)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface ReviewSummaryProps {
  averageRating: number
  totalCount: number
}

export const ReviewSummary: FC<ReviewSummaryProps> = ({
  averageRating,
  totalCount,
}) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
      <div className="text-center">
        <div className="text-accessible-2xl font-bold text-primary">
          {averageRating.toFixed(1)}
        </div>
        <div className="flex items-center justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              className={`w-4 h-4 ${
                star <= Math.round(averageRating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                clipRule="evenodd"
              />
            </svg>
          ))}
        </div>
      </div>
      <div className="text-accessible-base text-muted-foreground">
        총 <span className="font-bold text-foreground">{totalCount}</span>개의 리뷰
      </div>
    </div>
  )
}
