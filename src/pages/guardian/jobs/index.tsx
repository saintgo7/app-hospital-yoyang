import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase'
import type { JobPosting, Application } from '@/types/database.types'
import { formatCurrency, getTimeAgo } from '@/lib/utils'

interface JobWithApplications extends JobPosting {
  applications: Application[]
}

interface Props {
  jobs: JobWithApplications[]
}

type FilterStatus = 'all' | 'open' | 'in_progress' | 'completed' | 'closed'

const GuardianJobsPage: NextPage<Props> = ({ jobs: initialJobs }) => {
  const [jobs] = useState(initialJobs)
  const [filter, setFilter] = useState<FilterStatus>('all')

  const filteredJobs = jobs.filter((job) =>
    filter === 'all' ? true : job.status === filter
  )

  const statusCounts = {
    all: jobs.length,
    open: jobs.filter((j) => j.status === 'open').length,
    in_progress: jobs.filter((j) => j.status === 'in_progress').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    closed: jobs.filter((j) => j.status === 'closed').length,
  }

  return (
    <Layout title="내 구인글">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">내 구인글</h1>
            <p className="text-base text-muted-foreground">
              총 {jobs.length}개의 구인글
            </p>
          </div>
          <Link href="/guardian/jobs/new">
            <Button variant="guardian" size="lg">
              + 구인글 작성
            </Button>
          </Link>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3 mb-8">
          {(['all', 'open', 'in_progress', 'completed', 'closed'] as FilterStatus[]).map(
            (status) => (
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
                {status === 'open' && `모집 중 (${statusCounts.open})`}
                {status === 'in_progress' && `진행 중 (${statusCounts.in_progress})`}
                {status === 'completed' && `완료 (${statusCounts.completed})`}
                {status === 'closed' && `마감 (${statusCounts.closed})`}
              </button>
            )
          )}
        </div>

        {/* 구인글 목록 */}
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[N]</div>
              <p className="text-lg text-muted-foreground mb-4">
                {filter === 'all'
                  ? '아직 등록한 구인글이 없습니다.'
                  : '해당 상태의 구인글이 없습니다.'}
              </p>
              {filter === 'all' && (
                <Link href="/guardian/jobs/new">
                  <Button variant="guardian" size="lg">
                    구인글 작성하기
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

function JobCard({ job }: { job: JobWithApplications }) {
  const statusConfig = {
    open: { label: '모집 중', variant: 'caregiver' as const },
    in_progress: { label: '진행 중', variant: 'guardian' as const },
    completed: { label: '완료', variant: 'default' as const },
    closed: { label: '마감', variant: 'secondary' as const },
  }

  const { label, variant } = statusConfig[job.status]
  const pendingCount = job.applications.filter((a) => a.status === 'pending').length
  const acceptedCount = job.applications.filter((a) => a.status === 'accepted').length

  return (
    <Link href={`/guardian/jobs/${job.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold">{job.title}</h3>
                <Badge variant={variant}>{label}</Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-base text-muted-foreground">
                <span>[L] {job.location}</span>
                <span>[M] {formatCurrency(job.hourly_rate)}/시간</span>
                <span> {new Date(job.start_date).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{job.applications.length}</p>
                <p className="text-sm text-muted-foreground">지원자</p>
              </div>

              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-base">
                  새 지원 {pendingCount}건
                </Badge>
              )}

              {acceptedCount > 0 && (
                <Badge variant="success" className="text-base">
                  수락 {acceptedCount}명
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            {getTimeAgo(job.created_at)}에 작성
          </div>
        </CardContent>
      </Card>
    </Link>
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

  if (session.user.role !== 'guardian') {
    return {
      redirect: {
        destination: '/caregiver/dashboard',
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

  const { data: jobs } = await supabase
    .from('job_postings')
    .select(`
      *,
      applications(*)
    `)
    .eq('guardian_id', user.id)
    .order('created_at', { ascending: false })

  return {
    props: {
      jobs: (jobs as JobWithApplications[]) || [],
    },
  }
}

export default GuardianJobsPage
