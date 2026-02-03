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

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session.user.id, session.user.role)
    case 'POST':
      if (session.user.role !== 'caregiver') {
        return res.status(403).json({ error: '간병인만 지원할 수 있습니다.' })
      }
      return handlePost(req, res, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  role: string
) {
  try {
    if (role === 'caregiver') {
      // 간병인: 내 지원 목록
      const result = await query(
        `SELECT
          a.*,
          json_build_object(
            'id', j.id,
            'title', j.title,
            'description', j.description,
            'location', j.location,
            'care_type', j.care_type,
            'start_date', j.start_date,
            'end_date', j.end_date,
            'hourly_rate', j.hourly_rate,
            'status', j.status,
            'guardian', json_build_object(
              'id', u.id,
              'name', u.name
            )
          ) as job
         FROM applications a
         LEFT JOIN job_postings j ON a.job_id = j.id
         LEFT JOIN users u ON j.guardian_id = u.id
         WHERE a.caregiver_id = $1
         ORDER BY a.created_at DESC`,
        [userId]
      )

      return res.status(200).json({ applications: result.rows })
    } else {
      // 보호자: 내 구인글에 대한 지원 목록
      const { jobId } = req.query

      const params: any[] = [userId]
      let jobCondition = ''

      if (jobId) {
        params.push(jobId as string)
        jobCondition = ' AND j.id = $2'
      }

      const result = await query(
        `SELECT
          a.*,
          json_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url,
            'caregiver_profile', (
              SELECT json_build_object(
                'id', cp.id,
                'experience_years', cp.experience_years,
                'certifications', cp.certifications,
                'specializations', cp.specializations,
                'introduction', cp.introduction,
                'hourly_rate', cp.hourly_rate,
                'is_available', cp.is_available,
                'location', cp.location
              )
              FROM caregiver_profiles cp
              WHERE cp.user_id = u.id
            )
          ) as caregiver,
          json_build_object(
            'id', j.id,
            'title', j.title,
            'status', j.status
          ) as job
         FROM applications a
         LEFT JOIN users u ON a.caregiver_id = u.id
         LEFT JOIN job_postings j ON a.job_id = j.id
         WHERE j.guardian_id = $1${jobCondition}
         ORDER BY a.created_at DESC`,
        params
      )

      return res.status(200).json({ applications: result.rows })
    }
  } catch (error) {
    console.error('Applications fetch error:', error)
    return res.status(500).json({ error: '지원 내역을 불러오는데 실패했습니다.' })
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  caregiverId: string
) {
  const { jobId, message } = req.body

  if (!jobId) {
    return res.status(400).json({ error: '구인글 ID가 필요합니다.' })
  }

  try {
    // 구인글 존재 여부 및 상태 확인
    const jobResult = await query<{ id: string; status: string }>(
      'SELECT id, status FROM job_postings WHERE id = $1',
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
    }

    const job = jobResult.rows[0]

    if (job.status !== 'open') {
      return res.status(400).json({ error: '마감된 구인글입니다.' })
    }

    // 중복 지원 확인
    const existingResult = await query(
      'SELECT id FROM applications WHERE job_id = $1 AND caregiver_id = $2',
      [jobId, caregiverId]
    )

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '이미 지원한 구인글입니다.' })
    }

    // 지원 생성
    const applicationResult = await query(
      `INSERT INTO applications (job_id, caregiver_id, message, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [jobId, caregiverId, message || null, 'pending']
    )

    return res.status(201).json({
      success: true,
      application: applicationResult.rows[0],
    })
  } catch (error: any) {
    console.error('Application creation error:', error)

    // Unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: '이미 지원한 구인글입니다.' })
    }

    return res.status(500).json({ error: '지원에 실패했습니다.' })
  }
}
