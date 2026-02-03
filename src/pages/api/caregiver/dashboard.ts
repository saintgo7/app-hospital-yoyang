import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { query } from '@/lib/db'

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
    default:
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // 사용자 정보
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
    }

    const user = userResult.rows[0]

    // 간병인 프로필
    const profileResult = await query(
      'SELECT * FROM caregiver_profiles WHERE user_id = $1',
      [userId]
    )
    const profile = profileResult.rows[0] || null

    // 지원 내역 (최근 5개)
    const applicationsResult = await query(
      `SELECT
        a.*,
        json_build_object(
          'id', j.id,
          'title', j.title,
          'location', j.location,
          'hourly_rate', j.hourly_rate,
          'status', j.status
        ) as job
       FROM applications a
       LEFT JOIN job_postings j ON a.job_id = j.id
       WHERE a.caregiver_id = $1
       ORDER BY a.created_at DESC
       LIMIT 5`,
      [userId]
    )

    // 통계
    const totalResult = await query(
      'SELECT COUNT(*) as count FROM applications WHERE caregiver_id = $1',
      [userId]
    )

    const pendingResult = await query(
      'SELECT COUNT(*) as count FROM applications WHERE caregiver_id = $1 AND status = $2',
      [userId, 'pending']
    )

    const acceptedResult = await query(
      'SELECT COUNT(*) as count FROM applications WHERE caregiver_id = $1 AND status = $2',
      [userId, 'accepted']
    )

    return res.status(200).json({
      user,
      profile,
      applications: applicationsResult.rows,
      stats: {
        totalApplications: parseInt(totalResult.rows[0].count, 10),
        pendingApplications: parseInt(pendingResult.rows[0].count, 10),
        acceptedApplications: parseInt(acceptedResult.rows[0].count, 10),
      },
    })
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return res.status(500).json({ error: '대시보드 정보를 불러오는데 실패했습니다.' })
  }
}
