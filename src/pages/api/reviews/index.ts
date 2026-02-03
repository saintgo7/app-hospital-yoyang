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
      return handlePost(req, res, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  currentUserId: string,
  role: string
) {
  const { userId, jobId, type } = req.query

  try {
    // type이 'my'이면 현재 사용자의 받은/작성한 리뷰 모두 반환
    if (type === 'my') {
      // 받은 리뷰
      const receivedResult = await query(
        `SELECT
          r.*,
          json_build_object(
            'id', reviewer.id,
            'name', reviewer.name,
            'avatar_url', reviewer.avatar_url,
            'role', reviewer.role
          ) as reviewer,
          json_build_object(
            'id', reviewee.id,
            'name', reviewee.name,
            'avatar_url', reviewee.avatar_url,
            'role', reviewee.role
          ) as reviewee,
          CASE
            WHEN r.job_id IS NOT NULL THEN json_build_object('id', j.id, 'title', j.title)
            ELSE NULL
          END as job
         FROM reviews r
         LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
         LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
         LEFT JOIN job_postings j ON r.job_id = j.id
         WHERE r.reviewee_id = $1
         ORDER BY r.created_at DESC`,
        [currentUserId]
      )

      // 작성한 리뷰
      const givenResult = await query(
        `SELECT
          r.*,
          json_build_object(
            'id', reviewer.id,
            'name', reviewer.name,
            'avatar_url', reviewer.avatar_url,
            'role', reviewer.role
          ) as reviewer,
          json_build_object(
            'id', reviewee.id,
            'name', reviewee.name,
            'avatar_url', reviewee.avatar_url,
            'role', reviewee.role
          ) as reviewee,
          CASE
            WHEN r.job_id IS NOT NULL THEN json_build_object('id', j.id, 'title', j.title)
            ELSE NULL
          END as job
         FROM reviews r
         LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
         LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
         LEFT JOIN job_postings j ON r.job_id = j.id
         WHERE r.reviewer_id = $1
         ORDER BY r.created_at DESC`,
        [currentUserId]
      )

      const receivedReviews = receivedResult.rows
      const givenReviews = givenResult.rows

      const averageRating =
        receivedReviews.length > 0
          ? receivedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / receivedReviews.length
          : 0

      return res.status(200).json({
        receivedReviews,
        givenReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        role,
      })
    }

    // 기존 로직: userId나 jobId로 필터링
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (userId) {
      conditions.push(`r.reviewee_id = $${paramIndex++}`)
      params.push(userId as string)
    }

    if (jobId) {
      conditions.push(`r.job_id = $${paramIndex++}`)
      params.push(jobId as string)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT
        r.*,
        json_build_object(
          'id', reviewer.id,
          'name', reviewer.name,
          'avatar_url', reviewer.avatar_url,
          'role', reviewer.role
        ) as reviewer,
        json_build_object(
          'id', reviewee.id,
          'name', reviewee.name,
          'avatar_url', reviewee.avatar_url,
          'role', reviewee.role
        ) as reviewee,
        CASE
          WHEN r.job_id IS NOT NULL THEN json_build_object('id', j.id, 'title', j.title)
          ELSE NULL
        END as job
       FROM reviews r
       LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
       LEFT JOIN job_postings j ON r.job_id = j.id
       ${whereClause}
       ORDER BY r.created_at DESC`,
      params
    )

    const reviews = result.rows

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
        : 0

    return res.status(200).json({
      reviews,
      averageRating: Math.round(averageRating * 10) / 10,
      totalCount: reviews.length,
    })
  } catch (error) {
    console.error('Reviews fetch error:', error)
    return res.status(500).json({ error: '리뷰를 불러오는데 실패했습니다.' })
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const { jobId, revieweeId, rating, comment } = req.body

  // 유효성 검사
  if (!jobId || !revieweeId || rating === undefined) {
    return res.status(400).json({ error: '필수 정보가 누락되었습니다.' })
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: '평점은 1-5 사이여야 합니다.' })
  }

  if (revieweeId === userId) {
    return res.status(400).json({ error: '자신에게 리뷰를 작성할 수 없습니다.' })
  }

  try {
    // 해당 일자리가 완료 상태인지 확인
    const jobResult = await query<{
      id: string
      status: string
      guardian_id: string
    }>(
      'SELECT id, status, guardian_id FROM job_postings WHERE id = $1',
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: '일자리를 찾을 수 없습니다.' })
    }

    const job = jobResult.rows[0]

    if (job.status !== 'completed') {
      return res
        .status(400)
        .json({ error: '완료된 일자리에만 리뷰를 작성할 수 있습니다.' })
    }

    // 이미 리뷰를 작성했는지 확인
    const existingResult = await query(
      'SELECT id FROM reviews WHERE job_id = $1 AND reviewer_id = $2 AND reviewee_id = $3',
      [jobId, userId, revieweeId]
    )

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: '이미 리뷰를 작성하셨습니다.' })
    }

    // 리뷰 작성 권한 확인
    const appResult = await query<{ caregiver_id: string }>(
      'SELECT caregiver_id FROM applications WHERE job_id = $1 AND status = $2',
      [jobId, 'accepted']
    )

    if (appResult.rows.length === 0) {
      return res
        .status(400)
        .json({ error: '이 일자리에 대한 리뷰 권한이 없습니다.' })
    }

    const application = appResult.rows[0]

    const isGuardian = job.guardian_id === userId
    const isCaregiver = application.caregiver_id === userId

    if (!isGuardian && !isCaregiver) {
      return res
        .status(403)
        .json({ error: '이 일자리에 대한 리뷰 권한이 없습니다.' })
    }

    // 리뷰 대상이 올바른지 확인
    if (isGuardian && revieweeId !== application.caregiver_id) {
      return res
        .status(400)
        .json({ error: '간병인에게만 리뷰를 작성할 수 있습니다.' })
    }

    if (isCaregiver && revieweeId !== job.guardian_id) {
      return res
        .status(400)
        .json({ error: '보호자에게만 리뷰를 작성할 수 있습니다.' })
    }

    // 리뷰 저장
    const reviewResult = await query(
      `INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [jobId, userId, revieweeId, rating, comment || null]
    )

    // 리뷰어/리뷰이 정보 조회
    const fullReviewResult = await query(
      `SELECT
        r.*,
        json_build_object(
          'id', reviewer.id,
          'name', reviewer.name,
          'avatar_url', reviewer.avatar_url,
          'role', reviewer.role
        ) as reviewer,
        json_build_object(
          'id', reviewee.id,
          'name', reviewee.name,
          'avatar_url', reviewee.avatar_url,
          'role', reviewee.role
        ) as reviewee
       FROM reviews r
       LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
       WHERE r.id = $1`,
      [reviewResult.rows[0].id]
    )

    return res.status(201).json({ success: true, review: fullReviewResult.rows[0] })
  } catch (error: any) {
    console.error('Review create error:', error)

    // Unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: '이미 리뷰를 작성하셨습니다.' })
    }

    return res.status(500).json({ error: '리뷰 작성에 실패했습니다.' })
  }
}
