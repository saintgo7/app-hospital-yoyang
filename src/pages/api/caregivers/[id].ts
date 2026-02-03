import type { NextApiRequest, NextApiResponse } from 'next'
import { query } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query as { id: string }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id)
    default:
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  caregiverId: string
) {
  try {
    // 간병인 정보 조회
    const caregiverResult = await query(
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
       WHERE u.id = $1 AND u.role = 'caregiver'
       GROUP BY u.id, u.name, u.email, u.avatar_url, u.created_at`,
      [caregiverId]
    )

    if (caregiverResult.rows.length === 0) {
      return res.status(404).json({ error: '간병인을 찾을 수 없습니다.' })
    }

    const caregiver = caregiverResult.rows[0]

    // 리뷰 조회
    const reviewsResult = await query(
      `SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        json_build_object('name', u.name) as reviewer
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT 10`,
      [caregiverId]
    )

    // 평균 평점 계산
    const reviews = reviewsResult.rows
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0

    return res.status(200).json({
      caregiver,
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
    })
  } catch (error) {
    console.error('Caregiver fetch error:', error)
    return res.status(500).json({ error: '간병인 정보를 불러오는데 실패했습니다.' })
  }
}
