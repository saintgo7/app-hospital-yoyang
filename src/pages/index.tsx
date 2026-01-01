import type { NextPage } from 'next'
import Link from 'next/link'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'

const Home: NextPage = () => {
  return (
    <Layout
      title="케어매치"
      description="요양병원, 요양원 간병인과 보호자를 연결하는 신뢰할 수 있는 매칭 플랫폼"
    >
      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-accessible-3xl font-bold text-foreground mb-6">
            믿을 수 있는 간병인을
            <br />
            쉽고 빠르게 찾으세요
          </h1>
          <p className="text-accessible-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            케어매치는 요양병원, 요양원의 간병인과 보호자를 연결합니다.
            <br />
            검증된 간병인, 투명한 정보, 실시간 소통을 경험하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/auth/register?type=guardian">
              <Button
                variant="guardian"
                size="xl"
                className="w-full sm:w-auto gap-3"
              >
                <span className="text-2xl">👨‍👩‍👧</span>
                보호자로 시작하기
              </Button>
            </Link>
            <Link href="/auth/register?type=caregiver">
              <Button
                variant="caregiver"
                size="xl"
                className="w-full sm:w-auto gap-3"
              >
                <span className="text-2xl">💪</span>
                간병인으로 시작하기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 특징 섹션 */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-accessible-2xl font-bold text-center mb-12">
          왜 케어매치인가요?
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="✅"
            title="검증된 간병인"
            description="자격증과 경력이 검증된 전문 간병인만 활동합니다."
          />
          <FeatureCard
            icon="💬"
            title="실시간 채팅"
            description="간병인과 보호자가 직접 소통하며 상세히 상담할 수 있습니다."
          />
          <FeatureCard
            icon="⭐"
            title="솔직한 리뷰"
            description="실제 이용자의 솔직한 후기로 신뢰할 수 있습니다."
          />
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <StatCard value="1,200+" label="등록 간병인" />
            <StatCard value="3,500+" label="구인글 등록" />
            <StatCard value="98%" label="매칭 만족도" />
            <StatCard value="24시간" label="고객 지원" />
          </div>
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-accessible-2xl font-bold mb-6">
          지금 바로 시작하세요
        </h2>
        <p className="text-accessible-lg text-muted-foreground mb-8">
          간병인이든 보호자든, 케어매치가 함께합니다.
        </p>
        <Link href="/auth/register">
          <Button size="xl" className="text-accessible-lg">
            무료로 시작하기
          </Button>
        </Link>
      </section>
    </Layout>
  )
}

// 특징 카드 컴포넌트
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="bg-card rounded-2xl p-8 text-center shadow-sm border">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-accessible-lg font-bold mb-3">{title}</h3>
      <p className="text-accessible-base text-muted-foreground">{description}</p>
    </div>
  )
}

// 통계 카드 컴포넌트
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-accessible-2xl font-bold text-primary">{value}</div>
      <div className="text-accessible-base text-muted-foreground mt-2">
        {label}
      </div>
    </div>
  )
}

export default Home
