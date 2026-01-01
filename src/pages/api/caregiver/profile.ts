import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { createServerClient } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }

  if (session.user.role !== 'caregiver') {
    return res.status(403).json({ error: '간병인만 접근할 수 있습니다.' })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session.user.id)
    case 'PUT':
      return handlePut(req, res, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'PUT'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const supabase = createServerClient()

  const { data: profile, error } = await supabase
    .from('caregiver_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Profile fetch error:', error)
    return res.status(500).json({ error: '프로필을 불러오는데 실패했습니다.' })
  }

  return res.status(200).json({ profile: profile || null })
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const {
    experienceYears,
    certifications,
    specializations,
    introduction,
    hourlyRate,
    isAvailable,
    location,
  } = req.body

  const supabase = createServerClient()

  // 기존 프로필 확인
  const { data: existingProfile } = await supabase
    .from('caregiver_profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  const profileData = {
    user_id: userId,
    experience_years: experienceYears || 0,
    certifications: certifications || [],
    specializations: specializations || [],
    introduction: introduction || null,
    hourly_rate: hourlyRate || null,
    is_available: isAvailable ?? true,
    location: location || null,
  }

  let result
  if (existingProfile) {
    // 업데이트
    result = await supabase
      .from('caregiver_profiles')
      .update(profileData)
      .eq('user_id', userId)
      .select()
      .single()
  } else {
    // 생성
    result = await supabase
      .from('caregiver_profiles')
      .insert(profileData)
      .select()
      .single()
  }

  if (result.error) {
    console.error('Profile update error:', result.error)
    return res.status(500).json({ error: '프로필 저장에 실패했습니다.' })
  }

  return res.status(200).json({ success: true, profile: result.data })
}
