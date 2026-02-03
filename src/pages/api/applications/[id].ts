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

  const { id } = req.query as { id: string }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, id, session.user.id)
    case 'PATCH':
      return handlePatch(req, res, id, session.user.id, session.user.role)
    case 'DELETE':
      return handleDelete(req, res, id, session.user.id, session.user.role)
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  applicationId: string,
  userId: string
) {
  try {
    const result = await query(
      `SELECT
        a.*,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'avatar_url', c.avatar_url,
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
            WHERE cp.user_id = c.id
          )
        ) as caregiver,
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
          'guardian_id', j.guardian_id,
          'guardian', json_build_object(
            'id', g.id,
            'name', g.name
          )
        ) as job
       FROM applications a
       LEFT JOIN users c ON a.caregiver_id = c.id
       LEFT JOIN job_postings j ON a.job_id = j.id
       LEFT JOIN users g ON j.guardian_id = g.id
       WHERE a.id = $1`,
      [applicationId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '지원 내역을 찾을 수 없습니다.' })
    }

    const application = result.rows[0]

    // 권한 확인: 지원자 본인 또는 구인글 작성자만 조회 가능
    const isCaregiver = application.caregiver_id === userId
    const isGuardian = application.job.guardian_id === userId

    if (!isCaregiver && !isGuardian) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' })
    }

    return res.status(200).json({ application })
  } catch (error) {
    console.error('Application fetch error:', error)
    return res.status(500).json({ error: '지원 내역을 불러오는데 실패했습니다.' })
  }
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  applicationId: string,
  userId: string,
  role: string
) {
  const { status } = req.body

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: '올바른 상태값이 아닙니다.' })
  }

  // 보호자만 상태 변경 가능
  if (role !== 'guardian') {
    return res.status(403).json({ error: '보호자만 상태를 변경할 수 있습니다.' })
  }

  try {
    // 지원 내역 조회 및 권한 확인
    const appResult = await query<{
      id: string
      caregiver_id: string
      job_id: string
      guardian_id: string
    }>(
      `SELECT a.id, a.caregiver_id, a.job_id, j.guardian_id
       FROM applications a
       JOIN job_postings j ON a.job_id = j.id
       WHERE a.id = $1`,
      [applicationId]
    )

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: '지원 내역을 찾을 수 없습니다.' })
    }

    const application = appResult.rows[0]

    if (application.guardian_id !== userId) {
      return res.status(403).json({ error: '본인의 구인글에 대한 지원만 처리할 수 있습니다.' })
    }

    // 상태 업데이트
    const updateResult = await query(
      'UPDATE applications SET status = $1 WHERE id = $2 RETURNING *',
      [status, applicationId]
    )

    // 수락된 경우 채팅방 생성
    if (status === 'accepted') {
      const roomResult = await query(
        `SELECT id FROM chat_rooms
         WHERE caregiver_id = $1 AND guardian_id = $2`,
        [application.caregiver_id, userId]
      )

      if (roomResult.rows.length === 0) {
        await query(
          `INSERT INTO chat_rooms (job_id, caregiver_id, guardian_id)
           VALUES ($1, $2, $3)`,
          [application.job_id, application.caregiver_id, userId]
        )
      }
    }

    return res.status(200).json({ success: true, application: updateResult.rows[0] })
  } catch (error) {
    console.error('Application update error:', error)
    return res.status(500).json({ error: '상태 변경에 실패했습니다.' })
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  applicationId: string,
  userId: string,
  role: string
) {
  // 간병인만 지원 취소 가능
  if (role !== 'caregiver') {
    return res.status(403).json({ error: '간병인만 지원을 취소할 수 있습니다.' })
  }

  try {
    // 지원 내역 조회 및 권한 확인
    const appResult = await query<{
      id: string
      caregiver_id: string
      status: string
    }>(
      'SELECT id, caregiver_id, status FROM applications WHERE id = $1',
      [applicationId]
    )

    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: '지원 내역을 찾을 수 없습니다.' })
    }

    const application = appResult.rows[0]

    if (application.caregiver_id !== userId) {
      return res.status(403).json({ error: '본인의 지원만 취소할 수 있습니다.' })
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ error: '대기 중인 지원만 취소할 수 있습니다.' })
    }

    // 삭제
    await query('DELETE FROM applications WHERE id = $1', [applicationId])

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Application delete error:', error)
    return res.status(500).json({ error: '지원 취소에 실패했습니다.' })
  }
}
