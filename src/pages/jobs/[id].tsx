import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createServerClient } from '@/lib/supabase'
import type { JobPosting, User } from '@/types/database.types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface JobWithGuardian extends JobPosting {
  guardian: Pick<User, 'id' | 'name' | 'avatar_url'>
}

interface Props {
  job: JobWithGuardian
  hasApplied: boolean
}

const JobDetailPage: NextPage<Props> = ({ job, hasApplied: initialHasApplied }) => {
  const router = useRouter()
  const { data: session } = useSession()
  const [isApplying, setIsApplying] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [message, setMessage] = useState('')
  const [hasApplied, setHasApplied] = useState(initialHasApplied)
  const [error, setError] = useState<string | null>(null)

  const isCaregiver = session?.user?.role === 'caregiver'
  const patientInfo = job.patient_info as { age?: number; gender?: string; condition?: string }

  const handleApply = async () => {
    if (!session) {
      router.push('/auth/login')
      return
    }

    setIsApplying(true)
    setError(null)

    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          message: message.trim() || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '지원에 실패했습니다.')
      }

      setHasApplied(true)
      setShowApplyForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <Layout title={job.title}>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 상단 정보 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <Badge variant="caregiver" className="text-base">
                모집 중
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(job.created_at)}
              </span>
            </div>

            <h1 className="text-2xl font-bold mb-4">{job.title}</h1>

            <div className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <Avatar className="h-14 w-14">
                <AvatarImage src={job.guardian.avatar_url || undefined} />
                <AvatarFallback>{job.guardian.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-bold">{job.guardian.name}</p>
                <p className="text-sm text-muted-foreground">보호자</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-base">
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏥</span>
                <span>{job.care_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <span>{formatDate(job.start_date)} 시작</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <span className="font-bold text-primary">
                  {formatCurrency(job.hourly_rate)}/시간
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 환자 정보 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">환자 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl mb-1">👤</p>
                <p className="text-sm text-muted-foreground">나이</p>
                <p className="text-lg font-bold">
                  {patientInfo?.age || '-'}세
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl mb-1">{patientInfo?.gender === '여성' ? '👩' : '👨'}</p>
                <p className="text-sm text-muted-foreground">성별</p>
                <p className="text-lg font-bold">
                  {patientInfo?.gender || '-'}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl mb-1">🏥</p>
                <p className="text-sm text-muted-foreground">상태</p>
                <p className="text-lg font-bold">
                  {patientInfo?.condition || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 상세 설명 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">상세 설명</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base whitespace-pre-wrap">
              {job.description}
            </p>
          </CardContent>
        </Card>

        {/* 지원 영역 */}
        {isCaregiver && (
          <Card>
            <CardContent className="p-6">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-base mb-4">
                  {error}
                </div>
              )}

              {hasApplied ? (
                <div className="text-center py-6">
                  <div className="text-4xl mb-4">✅</div>
                  <p className="text-lg font-bold mb-2">
                    지원이 완료되었습니다!
                  </p>
                  <p className="text-base text-muted-foreground">
                    보호자의 연락을 기다려주세요.
                  </p>
                </div>
              ) : showApplyForm ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-base font-bold mb-2">
                      지원 메시지 (선택)
                    </p>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="보호자에게 전할 메시지를 작성해주세요. (경력, 자기소개 등)"
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1"
                      onClick={() => setShowApplyForm(false)}
                    >
                      취소
                    </Button>
                    <Button
                      variant="caregiver"
                      size="lg"
                      className="flex-1"
                      onClick={handleApply}
                      disabled={isApplying}
                    >
                      {isApplying ? '지원 중...' : '지원하기'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="caregiver"
                  size="lg"
                  className="w-full"
                  onClick={() => setShowApplyForm(true)}
                >
                  이 일자리에 지원하기
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {!session && (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-base text-muted-foreground mb-4">
                지원하려면 로그인이 필요합니다.
              </p>
              <Button
                variant="caregiver"
                size="lg"
                onClick={() => router.push('/auth/login')}
              >
                로그인하기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { id } = context.params as { id: string }
  const supabase = createServerClient()

  const { data: job, error } = await supabase
    .from('job_postings')
    .select(`
      *,
      guardian:users!guardian_id(id, name, avatar_url)
    `)
    .eq('id', id)
    .single()

  if (error || !job) {
    return { notFound: true }
  }

  // 로그인한 간병인이 이미 지원했는지 확인
  let hasApplied = false
  const { getServerSession } = await import('next-auth')
  const { authOptions } = await import('../api/auth/[...nextauth]')
  const session = await getServerSession(context.req, context.res, authOptions)

  if (session?.user?.role === 'caregiver') {
    const { data: application } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', id)
      .eq('caregiver_id', session.user.id)
      .single()

    hasApplied = !!application
  }

  return {
    props: {
      job: job as JobWithGuardian,
      hasApplied,
    },
  }
}

export default JobDetailPage
