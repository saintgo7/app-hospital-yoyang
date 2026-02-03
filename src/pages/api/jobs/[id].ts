import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
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
  jobId: string
) {
  try {
    const session = await getServerSession(req, res, authOptions)

    // 구인글 조회
    const jobResult = await query(
      `SELECT
        j.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as guardian
       FROM job_postings j
       LEFT JOIN users u ON j.guardian_id = u.id
       WHERE j.id = $1`,
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
    }

    const job = jobResult.rows[0]

    // 로그인한 간병인이 이미 지원했는지 확인
    let hasApplied = false
    if (session?.user?.role === 'caregiver') {
      const applicationResult = await query(
        'SELECT id FROM applications WHERE job_id = $1 AND caregiver_id = $2',
        [jobId, session.user.id]
      )
      hasApplied = applicationResult.rows.length > 0
    }

    return res.status(200).json({
      job,
      hasApplied,
    })
  } catch (error) {
    console.error('Job fetch error:', error)
    return res.status(500).json({ error: '구인글을 불러오는데 실패했습니다.' })
  }
}
