import type { NextPage, GetServerSideProps } from 'next'
import { useState, useMemo, memo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Layout } from '@/components/layout/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { JobPosting, User } from '@/types/database.types'
import { formatCurrency, getTimeAgo } from '@/lib/utils'

interface JobWithGuardian extends JobPosting {
  guardian: Pick<User, 'id' | 'name'>
}

interface Props {
  jobs: JobWithGuardian[]
  locations: string[]
}

const JobsPage: NextPage<Props> = ({ jobs: initialJobs, locations }) => {
  const { data: session } = useSession()
  const [jobs] = useState(initialJobs)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  // Use useMemo to optimize filtering performance
  const filteredJobs = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase()

    return jobs.filter((job) => {
      const matchesSearch =
        !searchQuery ||
        job.title.toLowerCase().includes(lowerQuery) ||
        job.description.toLowerCase().includes(lowerQuery)

      const matchesLocation = !selectedLocation || job.location.includes(selectedLocation)

      return matchesSearch && matchesLocation
    })
  }, [jobs, searchQuery, selectedLocation])

  return (
    <Layout title="구인 정보">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">구인 정보</h1>
          <p className="text-base text-muted-foreground">
            {jobs.length}개의 일자리가 있습니다
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="검색어를 입력하세요"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="lg">
              검색
            </Button>
          </div>

          {/* 지역 필터 */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedLocation === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedLocation(null)}
            >
              전체
            </Badge>
            {locations.map((location) => (
              <Badge
                key={location}
                variant={selectedLocation === location ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedLocation(location)}
              >
                {location}
              </Badge>
            ))}
          </div>
        </div>

        {/* 구인글 목록 */}
        {filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4"></div>
            <p className="text-lg text-muted-foreground">
              조건에 맞는 구인글이 없습니다.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} isCaregiver={session?.user?.role === 'caregiver'} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

// Memoize JobCard to prevent unnecessary re-renders
const JobCard = memo(function JobCard({
  job,
  isCaregiver,
}: {
  job: JobWithGuardian
  isCaregiver: boolean
}) {
  const patientInfo = job.patient_info as { age?: number; gender?: string; condition?: string }

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-bold">{job.title}</h3>
                <Badge variant="caregiver">모집 중</Badge>
              </div>

              <p className="text-base text-muted-foreground mb-3 line-clamp-2">
                {job.description}
              </p>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>[L] {job.location}</span>
                <span> {job.care_type}</span>
                {patientInfo?.age && <span>[U] {patientInfo.age}세</span>}
                <span> {new Date(job.start_date).toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xl font-bold text-primary">
                {formatCurrency(job.hourly_rate)}
              </p>
              <p className="text-sm text-muted-foreground">/시간</p>
              <p className="text-sm text-muted-foreground mt-2">
                {getTimeAgo(job.created_at)}
              </p>
            </div>
          </div>

          {isCaregiver && (
            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button variant="caregiver" size="lg">
                지원하기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
})

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  try {
    // API 라우트를 통해 구인글 조회
    const response = await fetch(`${baseUrl}/api/jobs?status=open`)

    if (!response.ok) {
      throw new Error('Failed to fetch jobs')
    }

    const data = await response.json()
    const jobs = data.jobs || []

    // 지역 목록 (중복 제거)
    const locations = Array.from(
      new Set(jobs.map((job: JobWithGuardian) => job.location.split(' ')[0]))
    ) as string[]

    return {
      props: {
        jobs,
        locations,
      },
    }
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return {
      props: {
        jobs: [],
        locations: [],
      },
    }
  }
}

export default JobsPage
