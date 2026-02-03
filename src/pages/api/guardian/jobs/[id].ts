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

  const { id } = req.query as { id: string }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id, session.user.id)
    case 'PATCH':
      return handlePatch(req, res, id, session.user.id)
    case 'DELETE':
      return handleDelete(req, res, id, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  jobId: string,
  userId: string
) {
  try {
    // 구인글과 지원자 정보 조회
    const jobResult = await query(
      `SELECT j.* FROM job_postings j
       WHERE j.id = $1 AND j.guardian_id = $2`,
      [jobId, userId]
    )

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
    }

    // 지원자 목록 조회
    const applicationsResult = await query(
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
        ) as caregiver
       FROM applications a
       LEFT JOIN users u ON a.caregiver_id = u.id
       WHERE a.job_id = $1
       ORDER BY a.created_at DESC`,
      [jobId]
    )

    const job = jobResult.rows[0]
    job.applications = applicationsResult.rows

    return res.status(200).json({ job })
  } catch (error) {
    console.error('Job fetch error:', error)
    return res.status(500).json({ error: '구인글을 불러오는데 실패했습니다.' })
  }
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  jobId: string,
  userId: string
) {
  const {
    status,
    title,
    description,
    location,
    careType,
    startDate,
    endDate,
    hourlyRate,
    patientInfo,
  } = req.body

  try {
    // 권한 확인
    const existingResult = await query(
      'SELECT id FROM job_postings WHERE id = $1 AND guardian_id = $2',
      [jobId, userId]
    )

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
    }

    // 동적 업데이트 쿼리 생성
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status && ['open', 'closed', 'in_progress', 'completed'].includes(status)) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }
    if (title) {
      updates.push(`title = $${paramIndex++}`)
      values.push(title)
    }
    if (description) {
      updates.push(`description = $${paramIndex++}`)
      values.push(description)
    }
    if (location) {
      updates.push(`location = $${paramIndex++}`)
      values.push(location)
    }
    if (careType) {
      updates.push(`care_type = $${paramIndex++}`)
      values.push(careType)
    }
    if (startDate) {
      updates.push(`start_date = $${paramIndex++}`)
      values.push(startDate)
    }
    if (endDate !== undefined) {
      updates.push(`end_date = $${paramIndex++}`)
      values.push(endDate)
    }
    if (hourlyRate) {
      updates.push(`hourly_rate = $${paramIndex++}`)
      values.push(hourlyRate)
    }
    if (patientInfo) {
      updates.push(`patient_info = $${paramIndex++}`)
      values.push(JSON.stringify(patientInfo))
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '업데이트할 내용이 없습니다.' })
    }

    values.push(jobId)
    const result = await query(
      `UPDATE job_postings
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    return res.status(200).json({ success: true, job: result.rows[0] })
  } catch (error) {
    console.error('Job update error:', error)
    return res.status(500).json({ error: '구인글 수정에 실패했습니다.' })
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  jobId: string,
  userId: string
) {
  try {
    // 권한 확인 및 상태 확인
    const jobResult = await query<{ id: string; status: string }>(
      'SELECT id, status FROM job_postings WHERE id = $1 AND guardian_id = $2',
      [jobId, userId]
    )

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
    }

    const job = jobResult.rows[0]

    // 진행 중인 구인글은 삭제 불가
    if (job.status === 'in_progress') {
      return res.status(400).json({ error: '진행 중인 구인글은 삭제할 수 없습니다.' })
    }

    // 삭제
    await query('DELETE FROM job_postings WHERE id = $1', [jobId])

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Job delete error:', error)
    return res.status(500).json({ error: '구인글 삭제에 실패했습니다.' })
  }
}
