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
    // 구인글 목록 조회
    const jobsResult = await query(
      'SELECT * FROM job_postings WHERE guardian_id = $1 ORDER BY created_at DESC',
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

    return res.status(200).json({
      jobs: jobsWithApplications,
    })
  } catch (error) {
    console.error('Jobs fetch error:', error)
    return res.status(500).json({ error: '구인글 목록을 불러오는데 실패했습니다.' })
  }
}
