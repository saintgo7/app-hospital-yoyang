import type { NextPage, GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { JobPosting, Application, CaregiverProfile } from '@/types/database.types'

interface Props {
  user: {
    id: string
    name: string
    email: string
  }
  profile: CaregiverProfile | null
  applications: (Application & { job: JobPosting })[]
  stats: {
    totalApplications: number
    pendingApplications: number
    acceptedApplications: number
  }
}

const CaregiverDashboard: NextPage<Props> = ({ user, profile, applications, stats }) => {
  return (
    <Layout title="간병인 대시보드">
      <div className="container mx-auto px-4 py-8">
        {/* 환영 메시지 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">
            안녕하세요, {user.name}님! [wave]
          </h1>
          <p className="text-base text-muted-foreground">
            오늘도 좋은 하루 되세요.
          </p>
        </div>

        {/* 프로필 미완성 알림 */}
        {!profile?.introduction && (
          <Card className="mb-8 border-caregiver bg-caregiver/5">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold mb-2">
                  프로필을 완성해주세요!
                </h3>
                <p className="text-base text-muted-foreground">
                  프로필이 완성되면 보호자에게 더 많이 노출됩니다.
                </p>
              </div>
              <Link href="/caregiver/profile">
                <Button variant="caregiver" size="lg">
                  프로필 작성하기
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="전체 지원"
            value={stats.totalApplications}
            icon="[N]"
          />
          <StatCard
            title="대기 중"
            value={stats.pendingApplications}
            icon="[wait]"
            variant="warning"
          />
          <StatCard
            title="수락됨"
            value={stats.acceptedApplications}
            icon="[v]"
            variant="success"
          />
        </div>

        {/* 빠른 메뉴 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <QuickMenu href="/jobs" icon="" label="일자리 찾기" />
          <QuickMenu href="/caregiver/applications" icon="[#]" label="지원 현황" />
          <QuickMenu href="/caregiver/profile" icon="[U]" label="내 프로필" />
          <QuickMenu href="/chat" icon="[...]" label="채팅" />
        </div>

        {/* 최근 지원 내역 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">최근 지원 내역</CardTitle>
            <Link href="/caregiver/applications">
              <Button variant="ghost" size="sm">
                전체보기
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">[empty]</div>
                <p className="text-base text-muted-foreground mb-4">
                  아직 지원한 일자리가 없습니다.
                </p>
                <Link href="/jobs">
                  <Button variant="caregiver" size="lg">
                    일자리 찾아보기
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <ApplicationCard key={application.id} application={application} />
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
  variant?: 'default' | 'success' | 'warning'
}) {
  const colors = {
    default: 'bg-card',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
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
}: {
  href: string
  icon: string
  label: string
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6 text-center">
          <div className="text-3xl mb-2">{icon}</div>
          <p className="text-base font-medium">{label}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

// 지원 카드 컴포넌트
function ApplicationCard({
  application,
}: {
  application: Application & { job: JobPosting }
}) {
  const statusLabels = {
    pending: '검토 중',
    accepted: '수락됨',
    rejected: '거절됨',
  }

  const statusVariants = {
    pending: 'warning' as const,
    accepted: 'success' as const,
    rejected: 'destructive' as const,
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div>
        <h4 className="text-base font-bold">{application.job.title}</h4>
        <p className="text-sm text-muted-foreground">
          {application.job.location}
        </p>
      </div>
      <Badge variant={statusVariants[application.status]}>
        {statusLabels[application.status]}
      </Badge>
    </div>
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

  if (session.user.role !== 'caregiver') {
    return {
      redirect: {
        destination: '/guardian/dashboard',
        permanent: false,
      },
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    // API 라우트를 통해 대시보드 데이터 조회
    const response = await fetch(`${baseUrl}/api/caregiver/dashboard`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data')
    }

    const data = await response.json()

    return {
      props: {
        user: data.user,
        profile: data.profile,
        applications: data.applications,
        stats: data.stats,
      },
    }
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }
}

export default CaregiverDashboard
