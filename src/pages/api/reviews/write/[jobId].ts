import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { query } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }

  const { jobId } = req.query as { jobId: string }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session.user.id, jobId)
    default:
      res.setHeader('Allow', ['GET'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  jobId: string
) {
  try {
    // 일자리 정보 조회
    const jobResult = await query(
      'SELECT * FROM job_postings WHERE id = $1 AND status = $2',
      [jobId, 'completed']
    )

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: '완료된 일자리를 찾을 수 없습니다.' })
    }

    const job = jobResult.rows[0]

    // 수락된 지원 조회
    const applicationResult = await query(
      `SELECT
        a.caregiver_id,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as caregiver
       FROM applications a
       LEFT JOIN users u ON a.caregiver_id = u.id
       WHERE a.job_id = $1 AND a.status = 'accepted'`,
      [jobId]
    )

    if (applicationResult.rows.length === 0) {
      return res.status(404).json({ error: '수락된 지원을 찾을 수 없습니다.' })
    }

    const application = applicationResult.rows[0]

    // 권한 확인
    const isGuardian = job.guardian_id === userId
    const isCaregiver = application.caregiver_id === userId

    if (!isGuardian && !isCaregiver) {
      return res.status(403).json({ error: '리뷰 작성 권한이 없습니다.' })
    }

    // 리뷰 대상 결정
    let reviewee

    if (isGuardian) {
      // 보호자 -> 간병인 리뷰
      reviewee = application.caregiver
    } else {
      // 간병인 -> 보호자 리뷰
      const guardianResult = await query(
        'SELECT id, name, avatar_url FROM users WHERE id = $1',
        [job.guardian_id]
      )

      if (guardianResult.rows.length === 0) {
        return res.status(404).json({ error: '보호자 정보를 찾을 수 없습니다.' })
      }

      reviewee = guardianResult.rows[0]
    }

    // 이미 작성한 리뷰가 있는지 확인
    const reviewResult = await query(
      'SELECT id FROM reviews WHERE job_id = $1 AND reviewer_id = $2 AND reviewee_id = $3',
      [jobId, userId, reviewee.id]
    )

    return res.status(200).json({
      job,
      reviewee,
      alreadyReviewed: reviewResult.rows.length > 0,
    })
  } catch (error) {
    console.error('Review write data fetch error:', error)
    return res.status(500).json({ error: '리뷰 작성 정보를 불러오는데 실패했습니다.' })
  }
}
