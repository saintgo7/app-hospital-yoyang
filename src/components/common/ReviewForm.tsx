import { type FC, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReviewFormProps {
  jobId: string
  revieweeId: string
  revieweeName: string
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>
  onCancel?: () => void
}

export const ReviewForm: FC<ReviewFormProps> = ({
  jobId,
  revieweeId,
  revieweeName,
  onSubmit,
  onCancel,
}) => {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('평점을 선택해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({ rating, comment })
    } catch (err) {
      setError(err instanceof Error ? err.message : '리뷰 작성에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const ratingLabels = ['', '불만족', '보통 이하', '보통', '만족', '매우 만족']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {revieweeName}님에게 리뷰 작성
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 별점 선택 */}
          <div>
            <label className="block text-base font-medium mb-3">
              평점을 선택해주세요
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={`${star}점`}
                >
                  <svg
                    className={`w-10 h-10 ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    } transition-colors`}
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
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-3 text-base text-muted-foreground">
                  {ratingLabels[rating]}
                </span>
              )}
            </div>
          </div>

          {/* 리뷰 코멘트 */}
          <div>
            <label
              htmlFor="comment"
              className="block text-base font-medium mb-2"
            >
              리뷰 내용 (선택)
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="간병 서비스에 대한 경험을 자유롭게 작성해주세요."
              className="min-h-[120px] text-base"
              maxLength={500}
            />
            <p className="mt-1 text-sm text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-base">
              {error}
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={onCancel}
                className="flex-1"
                disabled={isSubmitting}
              >
                취소
              </Button>
            )}
            <Button
              type="submit"
              variant="guardian"
              size="lg"
              className="flex-1"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? '저장 중...' : '리뷰 작성'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
