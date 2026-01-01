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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UserRole = 'caregiver' | 'guardian'

interface Props {
  email: string
  name: string
  image: string | null
  initialRole: UserRole | null
}

const CompleteProfilePage: NextPage<Props> = ({ email, name, image, initialRole }) => {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: name || '',
    phone: '',
    role: initialRole || ('guardian' as UserRole),
    introduction: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/users/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          email,
          avatarUrl: image,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '프로필 저장에 실패했습니다.')
      }

      // 역할에 따라 대시보드로 리다이렉트
      router.push(formData.role === 'caregiver' ? '/caregiver/dashboard' : '/guardian/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout title="프로필 완성" hideHeader hideFooter>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl">프로필 완성하기</CardTitle>
            <CardDescription className="text-base">
              서비스 이용을 위해 추가 정보를 입력해주세요
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-base">
                  {error}
                </div>
              )}

              {/* 역할 선택 */}
              <div className="space-y-3">
                <Label className="text-base" required>
                  이용 유형
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'guardian' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.role === 'guardian'
                        ? 'border-guardian bg-guardian/10'
                        : 'border-muted'
                    }`}
                  >
                    <div className="text-2xl mb-2">[G]</div>
                    <div className="text-base font-bold">보호자</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'caregiver' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.role === 'caregiver'
                        ? 'border-caregiver bg-caregiver/10'
                        : 'border-muted'
                    }`}
                  >
                    <div className="text-2xl mb-2">[C]</div>
                    <div className="text-base font-bold">간병인</div>
                  </button>
                </div>
              </div>

              {/* 이름 */}
              <div className="space-y-3">
                <Label htmlFor="name" required>
                  이름
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="실명을 입력해주세요"
                  required
                />
              </div>

              {/* 전화번호 */}
              <div className="space-y-3">
                <Label htmlFor="phone" required>
                  전화번호
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  카카오 알림톡 수신에 사용됩니다
                </p>
              </div>

              {/* 자기소개 (간병인만) */}
              {formData.role === 'caregiver' && (
                <div className="space-y-3">
                  <Label htmlFor="introduction">자기소개</Label>
                  <Textarea
                    id="introduction"
                    value={formData.introduction}
                    onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
                    placeholder="간병 경력, 특기, 근무 가능 지역 등을 자유롭게 작성해주세요"
                    rows={4}
                  />
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : '프로필 저장하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
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

  // 이미 프로필 완성된 사용자는 대시보드로
  if (session.user.isProfileComplete) {
    return {
      redirect: {
        destination: session.user.role === 'caregiver' ? '/caregiver/dashboard' : '/guardian/dashboard',
        permanent: false,
      },
    }
  }

  const role = context.query.role as UserRole | undefined

  return {
    props: {
      email: session.user.email,
      name: session.user.name || '',
      image: session.user.image || null,
      initialRole: role === 'caregiver' || role === 'guardian' ? role : null,
    },
  }
}

export default CompleteProfilePage
