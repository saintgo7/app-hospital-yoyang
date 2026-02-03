import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { JobPosting, Application, User, CaregiverProfile } from '@/types/database.types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface ApplicationWithCaregiver extends Application {
  caregiver: User & { caregiver_profile: CaregiverProfile[] }
}

interface Props {
  job: JobPosting
  applications: ApplicationWithCaregiver[]
  hasReviewed: boolean
}

const GuardianJobDetailPage: NextPage<Props> = ({ job, applications: initialApplications, hasReviewed }) => {
  const router = useRouter()
  const [applications, setApplications] = useState(initialApplications)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState(job.status)

  const handleStatusChange = async (applicationId: string, status: 'accepted' | 'rejected') => {
    setUpdatingId(applicationId)
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === applicationId ? { ...a, status } : a))
        )
      }
    } catch (error) {
      console.error('Status update error:', error)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleCloseJob = async () => {
    if (!confirm('정말 구인을 마감하시겠습니까?')) return

    try {
      const response = await fetch(`/api/guardian/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })

      if (response.ok) {
        setJobStatus('closed')
      }
    } catch (error) {
      console.error('Close job error:', error)
    }
  }

  const handleCompleteJob = async () => {
    if (!confirm('간병이 완료되었습니까? 완료 후에는 리뷰를 작성할 수 있습니다.')) return

    try {
      const response = await fetch(`/api/guardian/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })

      if (response.ok) {
        setJobStatus('completed')
      }
    } catch (error) {
      console.error('Complete job error:', error)
    }
  }

  const patientInfo = job.patient_info as { age?: number; gender?: string; condition?: string }
  const pendingApplications = applications.filter((a) => a.status === 'pending')
  const acceptedApplications = applications.filter((a) => a.status === 'accepted')
  const rejectedApplications = applications.filter((a) => a.status === 'rejected')

  return (
    <Layout title={job.title}>
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <JobStatusBadge status={jobStatus} />
            </div>
            <p className="text-base text-muted-foreground">
              {formatDate(job.created_at)}에 작성
            </p>
          </div>

          <div className="flex gap-3 flex-wrap justify-end">
            {jobStatus === 'open' && (
              <Button variant="outline" size="lg" onClick={handleCloseJob}>
                마감하기
              </Button>
            )}
            {jobStatus === 'in_progress' && (
              <Button variant="guardian" size="lg" onClick={handleCompleteJob}>
                간병 완료
              </Button>
            )}
            {jobStatus === 'completed' && !hasReviewed && acceptedApplications.length > 0 && (
              <Link href={`/reviews/write/${job.id}`}>
                <Button variant="guardian" size="lg">
                  리뷰 작성
                </Button>
              </Link>
            )}
            {jobStatus === 'completed' && hasReviewed && (
              <Link href="/reviews">
                <Button variant="outline" size="lg">
                  내 리뷰 보기
                </Button>
              </Link>
            )}
            <Link href={`/jobs/${job.id}`}>
              <Button variant="outline" size="lg">
                공개 페이지 보기
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 구인글 정보 */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">구인 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">근무지</p>
                  <p className="text-base font-medium">{job.location}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">시급</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(job.hourly_rate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">근무 시작일</p>
                  <p className="text-base font-medium">{formatDate(job.start_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">간병 유형</p>
                  <p className="text-base font-medium">{job.care_type}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">환자 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">나이</p>
                    <p className="text-base font-medium">{patientInfo?.age || '-'}세</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">성별</p>
                    <p className="text-base font-medium">{patientInfo?.gender || '-'}</p>
                  </div>
                </div>
                {patientInfo?.condition && (
                  <div>
                    <p className="text-sm text-muted-foreground">상태/증상</p>
                    <p className="text-base font-medium">{patientInfo.condition}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">상세 설명</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base whitespace-pre-wrap">{job.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* 지원자 목록 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  지원자 ({applications.length}명)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">[empty]</div>
                    <p className="text-base text-muted-foreground">
                      아직 지원자가 없습니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* 대기 중 */}
                    {pendingApplications.length > 0 && (
                      <div>
                        <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                          [wait] 대기 중 ({pendingApplications.length}명)
                        </h4>
                        <div className="space-y-4">
                          {pendingApplications.map((app) => (
                            <ApplicantCard
                              key={app.id}
                              application={app}
                              onAccept={() => handleStatusChange(app.id, 'accepted')}
                              onReject={() => handleStatusChange(app.id, 'rejected')}
                              isUpdating={updatingId === app.id}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 수락됨 */}
                    {acceptedApplications.length > 0 && (
                      <div>
                        <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                          [v] 수락됨 ({acceptedApplications.length}명)
                        </h4>
                        <div className="space-y-4">
                          {acceptedApplications.map((app) => (
                            <ApplicantCard key={app.id} application={app} accepted />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 거절됨 */}
                    {rejectedApplications.length > 0 && (
                      <div>
                        <h4 className="text-base font-bold mb-4 flex items-center gap-2 text-muted-foreground">
                          X 거절됨 ({rejectedApplications.length}명)
                        </h4>
                        <div className="space-y-4 opacity-60">
                          {rejectedApplications.map((app) => (
                            <ApplicantCard key={app.id} application={app} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function JobStatusBadge({ status }: { status: JobPosting['status'] }) {
  const config = {
    open: { label: '모집 중', variant: 'caregiver' as const },
    in_progress: { label: '진행 중', variant: 'guardian' as const },
    completed: { label: '완료', variant: 'default' as const },
    closed: { label: '마감', variant: 'secondary' as const },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

function ApplicantCard({
  application,
  onAccept,
  onReject,
  isUpdating,
  accepted,
}: {
  application: ApplicationWithCaregiver
  onAccept?: () => void
  onReject?: () => void
  isUpdating?: boolean
  accepted?: boolean
}) {
  const caregiver = application.caregiver
  const profile = caregiver.caregiver_profile?.[0] || null

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={caregiver.avatar_url || undefined} />
          <AvatarFallback>{caregiver.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h5 className="text-base font-bold">{caregiver.name}</h5>
            {profile?.is_available && (
              <Badge variant="caregiver" className="text-xs">
                구직 중
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
            {profile?.experience_years && <span>경력 {profile.experience_years}년</span>}
            {profile?.hourly_rate && <span>희망 {formatCurrency(profile.hourly_rate)}/시간</span>}
            {profile?.location && <span>[L] {profile.location}</span>}
          </div>

          {profile?.certifications && profile.certifications.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {profile.certifications.map((cert) => (
                <Badge key={cert} variant="outline" className="text-xs">
                  {cert}
                </Badge>
              ))}
            </div>
          )}

          {application.message && (
            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">{application.message}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {application.status === 'pending' && onAccept && onReject && (
            <>
              <Button
                variant="caregiver"
                size="lg"
                onClick={onAccept}
                disabled={isUpdating}
              >
                수락
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onReject}
                disabled={isUpdating}
              >
                거절
              </Button>
            </>
          )}

          {accepted && (
            <Link href="/chat">
              <Button variant="guardian" size="lg">
                채팅하기
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { id } = context.params as { id: string }
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

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    // API 라우트를 통해 구인글 정보 조회
    const response = await fetch(`${baseUrl}/api/guardian/jobs/${id}`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    })

    if (!response.ok) {
      return { notFound: true }
    }

    const data = await response.json()

    return {
      props: {
        job: data.job,
        applications: data.applications || [],
        hasReviewed: data.hasReviewed || false,
      },
    }
  } catch (error) {
    console.error('Error fetching job:', error)
    return { notFound: true }
  }
}

export default GuardianJobDetailPage
