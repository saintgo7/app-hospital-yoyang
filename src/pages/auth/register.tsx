import type { NextPage } from 'next'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type UserRole = 'caregiver' | 'guardian'

const RegisterPage: NextPage = () => {
  const router = useRouter()
  const { type } = router.query
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(
    type === 'caregiver' || type === 'guardian' ? type : null
  )

  const handleSocialLogin = (provider: 'kakao' | 'naver') => {
    if (!selectedRole) return

    // 역할 정보를 쿼리 파라미터로 전달
    signIn(provider, {
      callbackUrl: `/auth/complete-profile?role=${selectedRole}`,
    })
  }

  return (
    <Layout title="회원가입" hideFooter>
      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription className="text-base">
              케어매치와 함께 시작하세요
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* 역할 선택 */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-center">
                어떤 서비스를 이용하시겠어요?
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedRole('guardian')}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedRole === 'guardian'
                      ? 'border-guardian bg-guardian/10'
                      : 'border-muted hover:border-guardian/50'
                  }`}
                >
                  <div className="text-4xl mb-3">👨‍👩‍👧</div>
                  <div className="text-lg font-bold">보호자</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    간병인을 찾고 있어요
                  </p>
                </button>

                <button
                  onClick={() => setSelectedRole('caregiver')}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    selectedRole === 'caregiver'
                      ? 'border-caregiver bg-caregiver/10'
                      : 'border-muted hover:border-caregiver/50'
                  }`}
                >
                  <div className="text-4xl mb-3">💪</div>
                  <div className="text-lg font-bold">간병인</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    일자리를 찾고 있어요
                  </p>
                </button>
              </div>
            </div>

            {/* 소셜 로그인 */}
            {selectedRole && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-card px-4 text-muted-foreground">
                      간편 가입
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => handleSocialLogin('kakao')}
                  size="lg"
                  className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] font-bold gap-3"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M12 3c-5.523 0-10 3.582-10 8 0 2.833 1.857 5.315 4.656 6.745-.147.544-.535 1.975-.613 2.283-.097.385.141.38.297.277.123-.081 1.956-1.327 2.755-1.87.602.088 1.223.134 1.856.134 5.523 0 10-3.582 10-8s-4.477-8-10-8z" />
                  </svg>
                  카카오로 가입하기
                </Button>

                <Button
                  onClick={() => handleSocialLogin('naver')}
                  size="lg"
                  className="w-full bg-[#03C75A] hover:bg-[#02b350] text-white font-bold gap-3"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                    <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727v12.845z" />
                  </svg>
                  네이버로 가입하기
                </Button>
              </div>
            )}

            <div className="text-center text-base text-muted-foreground">
              <p>
                이미 계정이 있으신가요?{' '}
                <button
                  onClick={() => router.push('/auth/login')}
                  className="text-primary hover:underline font-medium"
                >
                  로그인
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default RegisterPage
