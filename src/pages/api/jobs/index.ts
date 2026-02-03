import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { query } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Start session promise early (async-api-routes pattern)
  const sessionPromise = getServerSession(req, res, authOptions)

  switch (req.method) {
    case 'GET':
      return handleGet(req, res)
    case 'POST':
      // Await session only when needed
      const session = await sessionPromise
      if (!session?.user) {
        return res.status(401).json({ error: '로그인이 필요합니다.' })
      }
      if (session.user.role !== 'guardian') {
        return res.status(403).json({ error: '보호자만 구인글을 등록할 수 있습니다.' })
      }
      return handlePost(req, res, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { location, careType, status = 'open' } = req.query

  type JobStatus = 'open' | 'closed' | 'in_progress' | 'completed'
  const validStatus = ['open', 'closed', 'in_progress', 'completed'].includes(status as string)
    ? (status as JobStatus)
    : 'open'

  try {
    // SQL 쿼리 조건 동적 생성
    const conditions: string[] = ['j.status = $1']
    const params: any[] = [validStatus]
    let paramIndex = 2

    if (location) {
      conditions.push(`j.location ILIKE $${paramIndex}`)
      params.push(`%${location}%`)
      paramIndex++
    }

    if (careType) {
      conditions.push(`j.care_type = $${paramIndex}`)
      params.push(careType as string)
      paramIndex++
    }

    const whereClause = conditions.join(' AND ')

    const result = await query(
      `SELECT
        j.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as guardian
       FROM job_postings j
       LEFT JOIN users u ON j.guardian_id = u.id
       WHERE ${whereClause}
       ORDER BY j.created_at DESC`,
      params
    )

    return res.status(200).json({ jobs: result.rows })
  } catch (error) {
    console.error('Jobs fetch error:', error)
    return res.status(500).json({ error: '구인글을 불러오는데 실패했습니다.' })
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const {
    title,
    description,
    location,
    careType,
    startDate,
    endDate,
    hourlyRate,
    patientInfo,
  } = req.body

  // 유효성 검사
  if (!title || title.trim().length < 5) {
    return res.status(400).json({ error: '제목을 5자 이상 입력해주세요.' })
  }

  if (!description || description.trim().length < 20) {
    return res.status(400).json({ error: '상세 설명을 20자 이상 입력해주세요.' })
  }

  if (!location) {
    return res.status(400).json({ error: '근무 장소를 입력해주세요.' })
  }

  if (!startDate) {
    return res.status(400).json({ error: '시작일을 선택해주세요.' })
  }

  if (!hourlyRate || hourlyRate < 9860) {
    return res.status(400).json({ error: '시급은 최저시급(9,860원) 이상이어야 합니다.' })
  }

  try {
    const result = await query(
      `INSERT INTO job_postings (
        guardian_id, title, description, location,
        care_type, start_date, end_date, hourly_rate,
        patient_info, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        title.trim(),
        description.trim(),
        location.trim(),
        careType,
        startDate,
        endDate || null,
        hourlyRate,
        JSON.stringify(patientInfo || {}),
        'open',
      ]
    )

    return res.status(201).json({ success: true, job: result.rows[0] })
  } catch (error) {
    console.error('Job creation error:', error)
    return res.status(500).json({ error: '구인글 등록에 실패했습니다.' })
  }
}
