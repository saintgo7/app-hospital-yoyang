import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const careTypes = [
  { value: 'hospital', label: '병원 간병' },
  { value: 'home', label: '가정 간병' },
  { value: 'nursing_home', label: '요양원 간병' },
  { value: 'day_care', label: '주간 보호' },
  { value: 'night_care', label: '야간 간병' },
]

const NewJobPage: NextPage = () => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    careType: 'hospital',
    startDate: '',
    endDate: '',
    hourlyRate: '',
    patientAge: '',
    patientGender: '남성',
    patientCondition: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          careType: formData.careType,
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          hourlyRate: parseInt(formData.hourlyRate),
          patientInfo: {
            age: parseInt(formData.patientAge),
            gender: formData.patientGender,
            condition: formData.patientCondition,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '구인글 등록에 실패했습니다.')
      }

      const { job } = await response.json()
      router.push(`/guardian/jobs/${job.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout title="구인글 작성">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-accessible-2xl">구인글 작성</CardTitle>
            <CardDescription className="text-accessible-base">
              상세한 정보를 작성하면 더 많은 간병인에게 노출됩니다.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-accessible-base">
                  {error}
                </div>
              )}

              {/* 제목 */}
              <div className="space-y-3">
                <Label htmlFor="title" required>
                  제목
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="예: 서울 강남구 요양병원 간병인 구합니다"
                  required
                />
              </div>

              {/* 간병 유형 */}
              <div className="space-y-3">
                <Label required>간병 유형</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {careTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, careType: type.value })}
                      className={`p-3 rounded-xl border-2 text-accessible-base transition-all ${
                        formData.careType === type.value
                          ? 'border-guardian bg-guardian/10 font-bold'
                          : 'border-muted'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 위치 */}
              <div className="space-y-3">
                <Label htmlFor="location" required>
                  근무 장소
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="예: 서울시 강남구 역삼동"
                  required
                />
              </div>

              {/* 기간 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="startDate" required>
                    시작일
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="endDate">종료일 (선택)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* 시급 */}
              <div className="space-y-3">
                <Label htmlFor="hourlyRate" required>
                  시급
                </Label>
                <div className="relative">
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="15000"
                    required
                    min="9860"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    원
                  </span>
                </div>
                <p className="text-accessible-sm text-muted-foreground">
                  2024년 최저시급: 9,860원
                </p>
              </div>

              {/* 환자 정보 */}
              <div className="space-y-4 p-4 bg-muted/50 rounded-xl">
                <h3 className="text-accessible-lg font-bold">환자 정보</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="patientAge" required>
                      나이
                    </Label>
                    <Input
                      id="patientAge"
                      type="number"
                      value={formData.patientAge}
                      onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                      placeholder="75"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label required>성별</Label>
                    <div className="flex gap-3">
                      {['남성', '여성'].map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setFormData({ ...formData, patientGender: gender })}
                          className={`flex-1 p-3 rounded-xl border-2 text-accessible-base transition-all ${
                            formData.patientGender === gender
                              ? 'border-guardian bg-guardian/10 font-bold'
                              : 'border-muted'
                          }`}
                        >
                          {gender}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="patientCondition">상태/증상</Label>
                  <Input
                    id="patientCondition"
                    value={formData.patientCondition}
                    onChange={(e) => setFormData({ ...formData, patientCondition: e.target.value })}
                    placeholder="예: 치매, 거동 불편"
                  />
                </div>
              </div>

              {/* 상세 설명 */}
              <div className="space-y-3">
                <Label htmlFor="description" required>
                  상세 설명
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="근무 조건, 환자 상태, 요청 사항 등을 자세히 작성해주세요."
                  rows={6}
                  required
                />
              </div>

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
                  variant="guardian"
                  size="xl"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '등록 중...' : '구인글 등록'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user || session.user.role !== 'guardian') {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  return { props: {} }
}

export default NewJobPage
