import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Korean names
const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '전']
const lastNames = ['영희', '순자', '영숙', '정숙', '미영', '경자', '숙자', '정자', '명숙', '옥순', '춘자', '영자', '말순', '순옥', '복순', '은영', '미숙', '현숙', '경숙', '정희']

// Locations
const locations = [
  '서울 강남구', '서울 서초구', '서울 송파구', '서울 강동구', '서울 마포구',
  '서울 영등포구', '서울 용산구', '서울 종로구', '서울 중구', '서울 성북구',
  '경기 성남시', '경기 수원시', '경기 용인시', '경기 고양시', '경기 안양시',
  '인천 남동구', '인천 부평구', '부산 해운대구', '대구 수성구', '광주 서구'
]

// Certifications
const certifications = [
  '요양보호사 1급', '요양보호사 2급', '간호조무사', '사회복지사 2급',
  '치매전문교육 이수', '응급처치 자격증', '노인심리상담사', '재활보조사'
]

// Specializations
const specializations = [
  '치매케어', '중풍케어', '와상환자', '식사보조', '재활운동',
  '야간케어', '병원동행', '가사지원', '목욕케어', '투석환자'
]

// Introductions
const introTemplates = [
  '안녕하세요. {years}년 경력의 전문 간병인입니다. 어르신을 내 부모님처럼 정성껏 돌봐드리겠습니다.',
  '{years}년간 요양병원과 가정에서 다양한 어르신을 돌봐왔습니다. 책임감과 성실함으로 최선을 다하겠습니다.',
  '어르신의 건강과 행복을 최우선으로 생각합니다. {years}년 경력으로 전문적인 케어를 제공합니다.',
  '따뜻한 마음으로 어르신을 돌봐드립니다. 경력 {years}년, 믿고 맡겨주세요.',
  '성실하고 책임감 있게 일합니다. {years}년 동안 많은 어르신들께 사랑받았습니다.',
  '어르신과의 소통을 중요시합니다. {years}년 경력의 베테랑 간병인입니다.',
  '24시간 상주케어 가능합니다. {years}년 경력으로 전문적인 서비스를 제공합니다.',
  '병원 및 가정 간병 모두 가능합니다. 경력 {years}년의 노하우로 케어해드립니다.'
]

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomElements<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function generatePhone(): string {
  const middle = Math.floor(Math.random() * 9000) + 1000
  const last = Math.floor(Math.random() * 9000) + 1000
  return `010-${middle}-${last}`
}

async function seedCaregivers() {
  console.log('Starting to seed caregivers...')

  for (let i = 0; i < 30; i++) {
    const name = randomElement(firstNames) + randomElement(lastNames)
    const email = `caregiver${i + 1}@example.com`
    const phone = generatePhone()
    const experienceYears = Math.floor(Math.random() * 15) + 1
    const hourlyRate = (Math.floor(Math.random() * 6) + 12) * 1000 // 12000 ~ 17000
    const location = randomElement(locations)
    const certs = randomElements(certifications, 1, 3)
    const specs = randomElements(specializations, 2, 4)
    const intro = randomElement(introTemplates).replace('{years}', experienceYears.toString())

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        phone,
        role: 'caregiver',
        avatar_url: null,
      })
      .select()
      .single()

    if (userError) {
      console.error(`Error creating user ${i + 1}:`, userError.message)
      continue
    }

    console.log(`Created user: ${name} (${user.id})`)

    // Create caregiver profile
    const { error: profileError } = await supabase
      .from('caregiver_profiles')
      .insert({
        user_id: user.id,
        experience_years: experienceYears,
        certifications: certs,
        specializations: specs,
        introduction: intro,
        hourly_rate: hourlyRate,
        is_available: Math.random() > 0.3, // 70% available
        location,
      })

    if (profileError) {
      console.error(`Error creating profile for ${name}:`, profileError.message)
    } else {
      console.log(`  -> Profile created: ${experienceYears}년 경력, ${location}`)
    }
  }

  console.log('\nSeeding completed!')
}

seedCaregivers().catch(console.error)
