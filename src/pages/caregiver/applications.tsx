import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase'
import type { Application, JobPosting, User } from '@/types/database.types'
import { formatCurrency, getTimeAgo } from '@/lib/utils'

interface ApplicationWithJob extends Application {
  job: JobPosting & { guardian: Pick<User, 'id' | 'name'> }
}

interface Props {
  applications: ApplicationWithJob[]
}

type FilterStatus = 'all' | 'pending' | 'accepted' | 'rejected'

const CaregiverApplicationsPage: NextPage<Props> = ({ applications: initialApplications }) => {
  const [applications, setApplications] = useState(initialApplications)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const filteredApplications = applications.filter((app) =>
    filter === 'all' ? true : app.status === filter
  )

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  }

  const handleCancel = async (applicationId: string) => {
    if (!confirm('정말 지원을 취소하시겠습니까?')) return

    setCancellingId(applicationId)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== applicationId))
      }
    } catch (error) {
      console.error('Cancel error:', error)
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <Layout title="지원 현황">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">지원 현황</h1>
          <p className="text-base text-muted-foreground">
            총 {applications.length}건의 지원 내역
          </p>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(['all', 'pending', 'accepted', 'rejected'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-base transition-all ${
                filter === status
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {status === 'all' && `전체 (${statusCounts.all})`}
              {status === 'pending' && `대기 중 (${statusCounts.pending})`}
              {status === 'accepted' && `수락됨 (${statusCounts.accepted})`}
              {status === 'rejected' && `거절됨 (${statusCounts.rejected})`}
            </button>
          ))}
        </div>

        {/* 지원 목록 */}
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[empty]</div>
              <p className="text-lg text-muted-foreground mb-4">
                {filter === 'all'
                  ? '아직 지원한 일자리가 없습니다.'
                  : '해당 상태의 지원 내역이 없습니다.'}
              </p>
              {filter === 'all' && (
                <Link href="/jobs">
                  <Button variant="caregiver" size="lg">
                    일자리 찾아보기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onCancel={handleCancel}
                isCancelling={cancellingId === application.id}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function ApplicationCard({
  application,
  onCancel,
  isCancelling,
}: {
  application: ApplicationWithJob
  onCancel: (id: string) => void
  isCancelling: boolean
}) {
  const statusConfig = {
    pending: { label: '검토 중', variant: 'warning' as const, icon: '[wait]' },
    accepted: { label: '수락됨', variant: 'success' as const, icon: '[v]' },
    rejected: { label: '거절됨', variant: 'destructive' as const, icon: 'X' },
  }

  const { label, variant, icon } = statusConfig[application.status]
  const job = application.job

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Link href={`/jobs/${job.id}`}>
                <h3 className="text-lg font-bold hover:text-primary transition-colors">
                  {job.title}
                </h3>
              </Link>
              <Badge variant={variant}>
                {icon} {label}
              </Badge>
            </div>

            <div className="space-y-2 text-base text-muted-foreground">
              <p>[L] {job.location}</p>
              <p>[M] {formatCurrency(job.hourly_rate)}/시간</p>
              <p>[U] {job.guardian.name} 보호자님</p>
              <p className="text-sm">지원일: {getTimeAgo(application.created_at)}</p>
            </div>

            {application.message && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">지원 메시지:</p>
                <p className="text-base">{application.message}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Link href={`/jobs/${job.id}`}>
              <Button variant="outline" size="lg" className="w-full">
                상세 보기
              </Button>
            </Link>

            {application.status === 'accepted' && (
              <>
                <Link href={`/chat`}>
                  <Button variant="caregiver" size="lg" className="w-full">
                    채팅하기
                  </Button>
                </Link>
                {application.job.status === 'completed' && (
                  <Link href={`/reviews/write/${application.job.id}`}>
                    <Button variant="outline" size="lg" className="w-full">
                      리뷰 작성
                    </Button>
                  </Link>
                )}
              </>
            )}

            {application.status === 'pending' && (
              <Button
                variant="outline"
                size="lg"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={() => onCancel(application.id)}
                disabled={isCancelling}
              >
                {isCancelling ? '취소 중...' : '지원 취소'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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

  if (session.user.role !== 'caregiver') {
    return {
      redirect: {
        destination: '/guardian/dashboard',
        permanent: false,
      },
    }
  }

  const supabase = createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('id')
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

  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      job:job_postings(
        *,
        guardian:users!guardian_id(id, name)
      )
    `)
    .eq('caregiver_id', user.id)
    .order('created_at', { ascending: false })

  return {
    props: {
      applications: (applications as ApplicationWithJob[]) || [],
    },
  }
}

export default CaregiverApplicationsPage
