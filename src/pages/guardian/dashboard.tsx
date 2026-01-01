import type { NextPage, GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '../api/auth/[...nextauth]'
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
  user: {
    id: string
    name: string
    email: string
  }
  jobs: JobWithApplications[]
  stats: {
    totalJobs: number
    openJobs: number
    totalApplications: number
  }
}

const GuardianDashboard: NextPage<Props> = ({ user, jobs, stats }) => {
  return (
    <Layout title="보호자 대시보드">
      <div className="container mx-auto px-4 py-8">
        {/* 환영 메시지 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            안녕하세요, {user.name}님! 👋
          </h1>
          <p className="text-base text-muted-foreground">
            좋은 간병인을 찾으실 수 있도록 도와드릴게요.
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="등록한 구인글"
            value={stats.totalJobs}
            icon="[N]"
          />
          <StatCard
            title="모집 중"
            value={stats.openJobs}
            icon=""
            variant="caregiver"
          />
          <StatCard
            title="받은 지원"
            value={stats.totalApplications}
            icon="📨"
            variant="guardian"
          />
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickMenu href="/guardian/jobs/new" icon="" label="구인글 작성" primary />
          <QuickMenu href="/guardian/jobs" icon="[#]" label="내 구인글" />
          <QuickMenu href="/caregivers" icon="" label="간병인 찾기" />
          <QuickMenu href="/chat" icon="[...]" label="채팅" />
        </div>

        {/* 내 구인글 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">내 구인글</CardTitle>
            <Link href="/guardian/jobs">
              <Button variant="ghost" size="sm">
                전체보기
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">[N]</div>
                <p className="text-base text-muted-foreground mb-4">
                  아직 등록한 구인글이 없습니다.
                </p>
                <Link href="/guardian/jobs/new">
                  <Button variant="guardian" size="lg">
                    구인글 작성하기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string
  value: number
  icon: string
  variant?: 'default' | 'caregiver' | 'guardian'
}) {
  const colors = {
    default: 'bg-card',
    caregiver: 'bg-caregiver-light border-caregiver',
    guardian: 'bg-guardian-light border-guardian',
  }

  return (
    <Card className={colors[variant]}>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="text-4xl">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// 빠른 메뉴 컴포넌트
function QuickMenu({
  href,
  icon,
  label,
  primary = false,
}: {
  href: string
  icon: string
  label: string
  primary?: boolean
}) {
  return (
    <Link href={href}>
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer ${
          primary ? 'border-guardian bg-guardian/5' : ''
        }`}
      >
        <CardContent className="p-6 text-center">
          <div className="text-3xl mb-2">{icon}</div>
          <p className={`text-base font-medium ${primary ? 'text-guardian-dark' : ''}`}>
            {label}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

// 구인글 카드 컴포넌트
function JobCard({ job }: { job: JobWithApplications }) {
  const statusLabels = {
    open: '모집 중',
    closed: '마감',
    in_progress: '진행 중',
    completed: '완료',
  }

  const statusVariants = {
    open: 'caregiver' as const,
    closed: 'secondary' as const,
    in_progress: 'guardian' as const,
    completed: 'default' as const,
  }

  const pendingCount = job.applications.filter((a) => a.status === 'pending').length

  return (
    <Link href={`/guardian/jobs/${job.id}`}>
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="text-base font-bold">{job.title}</h4>
            <Badge variant={statusVariants[job.status]}>
              {statusLabels[job.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {job.location} · {formatCurrency(job.hourly_rate)}/시간
          </p>
        </div>

        <div className="text-right">
          {pendingCount > 0 && (
            <Badge variant="destructive" className="mb-1">
              새 지원 {pendingCount}건
            </Badge>
          )}
          <p className="text-sm text-muted-foreground">
            {getTimeAgo(job.created_at)}
          </p>
        </div>
      </div>
    </Link>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user?.email) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  if (!session.user.isProfileComplete) {
    return {
      redirect: {
        destination: '/auth/complete-profile',
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

  // 사용자 정보
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', session.user.email)
    .single()

  if (!user) {
    return {
      redirect: {
        destination: '/auth/complete-profile',
        permanent: false,
      },
    }
  }

  // 구인글 (최근 5개)
  const { data: jobs } = await supabase
    .from('job_postings')
    .select(`
      *,
      applications(*)
    `)
    .eq('guardian_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // 통계
  const { count: totalJobs } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .eq('guardian_id', user.id)

  const { count: openJobs } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .eq('guardian_id', user.id)
    .eq('status', 'open')

  // 받은 지원 수
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('id')
    .eq('guardian_id', user.id)

  let totalApplications = 0
  if (allJobs && allJobs.length > 0) {
    const jobIds = allJobs.map((j) => j.id)
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('job_id', jobIds)
    totalApplications = count || 0
  }

  return {
    props: {
      user,
      jobs: (jobs as JobWithApplications[]) || [],
      stats: {
        totalJobs: totalJobs || 0,
        openJobs: openJobs || 0,
        totalApplications,
      },
    },
  }
}

export default GuardianDashboard
