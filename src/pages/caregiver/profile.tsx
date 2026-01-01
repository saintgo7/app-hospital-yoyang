import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createServerClient } from '@/lib/supabase'
import type { CaregiverProfile, User } from '@/types/database.types'

const SPECIALIZATIONS = [
  '치매 케어',
  '뇌졸중 케어',
  '암 환자 케어',
  '거동 불편',
  '식사 보조',
  '목욕 보조',
  '병원 동행',
  '야간 케어',
  '주말 케어',
  '장기 케어',
]

const CERTIFICATIONS = [
  '요양보호사',
  '간호조무사',
  '간호사',
  '사회복지사',
  '물리치료사',
  '작업치료사',
]

interface Props {
  user: Pick<User, 'id' | 'name' | 'email'>
  profile: CaregiverProfile | null
}

const CaregiverProfilePage: NextPage<Props> = ({ user, profile: initialProfile }) => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    experienceYears: initialProfile?.experience_years || 0,
    certifications: initialProfile?.certifications || [],
    specializations: initialProfile?.specializations || [],
    introduction: initialProfile?.introduction || '',
    hourlyRate: initialProfile?.hourly_rate?.toString() || '',
    isAvailable: initialProfile?.is_available ?? true,
    location: initialProfile?.location || '',
  })

  const toggleCertification = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(cert)
        ? prev.certifications.filter((c) => c !== cert)
        : [...prev.certifications, cert],
    }))
  }

  const toggleSpecialization = (spec: string) => {
    setFormData((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/caregiver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          hourlyRate: formData.hourlyRate ? parseInt(formData.hourlyRate) : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '프로필 저장에 실패했습니다.')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout title="내 프로필">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-accessible-2xl">내 프로필</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-accessible-base">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-100 text-green-800 p-4 rounded-xl text-accessible-base">
                  프로필이 저장되었습니다!
                </div>
              )}

              {/* 기본 정보 */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
                <h3 className="text-accessible-lg font-bold">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-accessible-sm text-muted-foreground">이름</Label>
                    <p className="text-accessible-base font-medium">{user.name}</p>
                  </div>
                  <div>
                    <Label className="text-accessible-sm text-muted-foreground">이메일</Label>
                    <p className="text-accessible-base font-medium">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* 구직 상태 */}
              <div className="space-y-3">
                <Label className="text-accessible-lg font-bold">구직 상태</Label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isAvailable: true })}
                    className={`flex-1 p-4 rounded-xl border-2 text-accessible-base transition-all ${
                      formData.isAvailable
                        ? 'border-caregiver bg-caregiver/10 font-bold'
                        : 'border-muted'
                    }`}
                  >
                    🟢 구직 중
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isAvailable: false })}
                    className={`flex-1 p-4 rounded-xl border-2 text-accessible-base transition-all ${
                      !formData.isAvailable
                        ? 'border-muted-foreground bg-muted font-bold'
                        : 'border-muted'
                    }`}
                  >
                    ⚪ 구직 완료
                  </button>
                </div>
              </div>

              {/* 경력 */}
              <div className="space-y-3">
                <Label htmlFor="experienceYears">경력 (년)</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experienceYears}
                  onChange={(e) =>
                    setFormData({ ...formData, experienceYears: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              {/* 희망 시급 */}
              <div className="space-y-3">
                <Label htmlFor="hourlyRate">희망 시급</Label>
                <div className="relative">
                  <Input
                    id="hourlyRate"
                    type="number"
                    min="9860"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="15000"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    원
                  </span>
                </div>
              </div>

              {/* 근무 가능 지역 */}
              <div className="space-y-3">
                <Label htmlFor="location">근무 가능 지역</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="예: 서울시 강남구, 서초구"
                />
              </div>

              {/* 자격증 */}
              <div className="space-y-3">
                <Label>보유 자격증</Label>
                <div className="flex flex-wrap gap-2">
                  {CERTIFICATIONS.map((cert) => (
                    <Badge
                      key={cert}
                      variant={formData.certifications.includes(cert) ? 'caregiver' : 'outline'}
                      className="cursor-pointer text-accessible-base py-2 px-4"
                      onClick={() => toggleCertification(cert)}
                    >
                      {formData.certifications.includes(cert) ? '✓ ' : ''}
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 전문 분야 */}
              <div className="space-y-3">
                <Label>전문 분야</Label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALIZATIONS.map((spec) => (
                    <Badge
                      key={spec}
                      variant={formData.specializations.includes(spec) ? 'caregiver' : 'outline'}
                      className="cursor-pointer text-accessible-base py-2 px-4"
                      onClick={() => toggleSpecialization(spec)}
                    >
                      {formData.specializations.includes(spec) ? '✓ ' : ''}
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* 자기소개 */}
              <div className="space-y-3">
                <Label htmlFor="introduction">자기소개</Label>
                <Textarea
                  id="introduction"
                  value={formData.introduction}
                  onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                  placeholder="간병 경력, 특기, 성격 등을 자유롭게 작성해주세요."
                  rows={6}
                />
              </div>

              {/* 버튼 */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  size="xl"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  variant="caregiver"
                  size="xl"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '저장 중...' : '프로필 저장'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
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
    .select('id, name, email')
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

  const { data: profile } = await supabase
    .from('caregiver_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return {
    props: {
      user,
      profile: profile || null,
    },
  }
}

export default CaregiverProfilePage
