import type { NextApiRequest, NextApiResponse } from 'next'
import { query } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 간병인 목록 조회
    const caregiversResult = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        u.created_at,
        json_agg(
          json_build_object(
            'id', cp.id,
            'user_id', cp.user_id,
            'experience_years', cp.experience_years,
            'certifications', cp.certifications,
            'specializations', cp.specializations,
            'introduction', cp.introduction,
            'hourly_rate', cp.hourly_rate,
            'is_available', cp.is_available,
            'location', cp.location
          )
        ) FILTER (WHERE cp.id IS NOT NULL) as caregiver_profile
       FROM users u
       LEFT JOIN caregiver_profiles cp ON u.id = cp.user_id
       WHERE u.role = 'caregiver'
       GROUP BY u.id, u.name, u.email, u.avatar_url, u.created_at
       ORDER BY u.created_at DESC`
    )

    // 프로필이 있는 간병인만 필터링
    const filteredCaregivers = caregiversResult.rows.filter(
      (c: any) => c.caregiver_profile && c.caregiver_profile.length > 0
    )

    // 지역 목록 (중복 제거)
    const locations = Array.from(
      new Set(
        filteredCaregivers
          .map((c: any) => c.caregiver_profile?.[0]?.location)
          .filter(Boolean)
          .map((loc: string) => loc.split(' ')[0])
      )
    )

    return res.status(200).json({
      caregivers: filteredCaregivers,
      locations,
    })
  } catch (error) {
    console.error('Caregivers fetch error:', error)
    return res.status(500).json({ error: '간병인 목록을 불러오는데 실패했습니다.' })
  }
}
