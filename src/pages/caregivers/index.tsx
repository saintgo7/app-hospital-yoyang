import type { NextPage, GetServerSideProps } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createServerClient } from '@/lib/supabase'
import type { CaregiverProfile, User } from '@/types/database.types'
import { formatCurrency, getTimeAgo } from '@/lib/utils'

interface CaregiverWithProfile extends User {
  caregiver_profile: CaregiverProfile[]
}

interface Props {
  caregivers: CaregiverWithProfile[]
  locations: string[]
}

const CaregiversPage: NextPage<Props> = ({ caregivers: initialCaregivers, locations }) => {
  const [caregivers, setCaregivers] = useState(initialCaregivers)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null)

  // 모든 전문 분야 수집
  const allSpecializations = Array.from(
    new Set(
      caregivers.flatMap((c) => c.caregiver_profile?.[0]?.specializations || [])
    )
  )

  const filteredCaregivers = caregivers.filter((caregiver) => {
    const profile = caregiver.caregiver_profile?.[0]
    if (!profile?.introduction) return false

    const matchesSearch =
      !searchQuery ||
      caregiver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.introduction.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesLocation =
      !selectedLocation || profile.location?.includes(selectedLocation)

    const matchesSpecialization =
      !selectedSpecialization ||
      profile.specializations?.includes(selectedSpecialization)

    return matchesSearch && matchesLocation && matchesSpecialization
  })

  return (
    <Layout title="간병인 찾기">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">간병인 찾기</h1>
          <p className="text-base text-muted-foreground">
            {filteredCaregivers.length}명의 간병인이 있습니다
          </p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="이름, 자기소개로 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="lg">
              검색
            </Button>
          </div>

          {/* 지역 필터 */}
          <div>
            <p className="text-sm font-medium mb-2">지역</p>
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

          {/* 전문 분야 필터 */}
          {allSpecializations.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">전문 분야</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedSpecialization === null ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedSpecialization(null)}
                >
                  전체
                </Badge>
                {allSpecializations.map((spec) => (
                  <Badge
                    key={spec}
                    variant={selectedSpecialization === spec ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedSpecialization(spec)}
                  >
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 간병인 목록 */}
        {filteredCaregivers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[empty]</div>
              <p className="text-lg text-muted-foreground">
                조건에 맞는 간병인이 없습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCaregivers.map((caregiver) => {
              const profile = caregiver.caregiver_profile?.[0]
              if (!profile?.introduction) return null

              return (
                <Link key={caregiver.id} href={`/caregivers/${caregiver.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={caregiver.avatar_url || undefined} />
                          <AvatarFallback>{caregiver.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold truncate">{caregiver.name}</h3>
                          {profile.is_available && (
                            <Badge variant="caregiver" className="text-xs mt-1">
                              [active] 구직 중
                            </Badge>
                          )}
                        </div>
                      </div>

                      {profile.experience_years > 0 && (
                        <p className="text-sm text-muted-foreground mb-2">
                          경력 {profile.experience_years}년
                        </p>
                      )}

                      {profile.location && (
                        <p className="text-sm text-muted-foreground mb-3">
                          [L] {profile.location}
                        </p>
                      )}

                      {profile.hourly_rate && (
                        <p className="text-base font-bold text-primary mb-3">
                          {formatCurrency(profile.hourly_rate)}/시간
                        </p>
                      )}

                      {profile.certifications && profile.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {profile.certifications.slice(0, 2).map((cert) => (
                            <Badge key={cert} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                          {profile.certifications.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.certifications.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {profile.introduction}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const supabase = createServerClient()

  // 프로필이 완성된 간병인 목록
  const { data: caregivers } = await supabase
    .from('users')
    .select(`
      *,
      caregiver_profile:caregiver_profiles(*)
    `)
    .eq('role', 'caregiver')
    .order('created_at', { ascending: false })

  // 프로필이 있는 간병인만 필터링
  const filteredCaregivers = (caregivers || []).filter(
    (c) => c.caregiver_profile && c.caregiver_profile.length > 0
  )

  // 지역 목록 (중복 제거)
  const locations = Array.from(
    new Set(
      filteredCaregivers
        .map((c) => c.caregiver_profile?.[0]?.location)
        .filter(Boolean)
        .map((loc) => loc!.split(' ')[0])
    )
  )

  return {
    props: {
      caregivers: filteredCaregivers as CaregiverWithProfile[],
      locations,
    },
  }
}

export default CaregiversPage
