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

  if (session.user.role !== 'guardian') {
    return res.status(403).json({ error: '보호자만 접근할 수 있습니다.' })
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

    // 구인글 목록 (최근 5개)
    const jobsResult = await query(
      'SELECT * FROM job_postings WHERE guardian_id = $1 ORDER BY created_at DESC LIMIT 5',
      [userId]
    )

    // 각 구인글의 지원 목록
    const jobsWithApplications = await Promise.all(
      jobsResult.rows.map(async (job: any) => {
        const applicationsResult = await query(
          'SELECT * FROM applications WHERE job_id = $1',
          [job.id]
        )
        return {
          ...job,
          applications: applicationsResult.rows,
        }
      })
    )

    // 통계
    const totalJobsResult = await query(
      'SELECT COUNT(*) as count FROM job_postings WHERE guardian_id = $1',
      [userId]
    )

    const activeJobsResult = await query(
      'SELECT COUNT(*) as count FROM job_postings WHERE guardian_id = $1 AND status = $2',
      [userId, 'open']
    )

    const totalApplicationsResult = await query(
      `SELECT COUNT(*) as count
       FROM applications a
       LEFT JOIN job_postings j ON a.job_id = j.id
       WHERE j.guardian_id = $1`,
      [userId]
    )

    const pendingApplicationsResult = await query(
      `SELECT COUNT(*) as count
       FROM applications a
       LEFT JOIN job_postings j ON a.job_id = j.id
       WHERE j.guardian_id = $1 AND a.status = $2`,
      [userId, 'pending']
    )

    return res.status(200).json({
      user,
      jobs: jobsWithApplications,
      stats: {
        totalJobs: parseInt(totalJobsResult.rows[0].count, 10),
        openJobs: parseInt(activeJobsResult.rows[0].count, 10),
        totalApplications: parseInt(totalApplicationsResult.rows[0].count, 10),
        pendingApplications: parseInt(pendingApplicationsResult.rows[0].count, 10),
      },
    })
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return res.status(500).json({ error: '대시보드 정보를 불러오는데 실패했습니다.' })
  }
}
