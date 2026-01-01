import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { createServerClient } from '@/lib/supabase'

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
      return handleGet(req, res)
    case 'POST':
      return handlePost(req, res, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { userId, jobId } = req.query
  const supabase = createServerClient()

  let query = supabase
    .from('reviews')
    .select(`
      *,
      reviewer:users!reviewer_id(id, name, avatar_url, role),
      reviewee:users!reviewee_id(id, name, avatar_url, role),
      job:job_postings(id, title)
    `)
    .order('created_at', { ascending: false })

  // 특정 사용자가 받은 리뷰 조회
  if (userId) {
    query = query.eq('reviewee_id', userId as string)
  }

  // 특정 일자리 관련 리뷰 조회
  if (jobId) {
    query = query.eq('job_id', jobId as string)
  }

  const { data: reviews, error } = await query

  if (error) {
    console.error('Reviews fetch error:', error)
    return res.status(500).json({ error: '리뷰를 불러오는데 실패했습니다.' })
  }

  // 평균 평점 계산
  const averageRating = reviews && reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return res.status(200).json({
    reviews,
    averageRating: Math.round(averageRating * 10) / 10,
    totalCount: reviews?.length || 0,
  })
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

  const supabase = createServerClient()

  // 해당 일자리가 완료 상태인지 확인
  const { data: job, error: jobError } = await supabase
    .from('job_postings')
    .select('id, status, guardian_id')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return res.status(404).json({ error: '일자리를 찾을 수 없습니다.' })
  }

  if (job.status !== 'completed') {
    return res.status(400).json({ error: '완료된 일자리에만 리뷰를 작성할 수 있습니다.' })
  }

  // 이미 리뷰를 작성했는지 확인
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('job_id', jobId)
    .eq('reviewer_id', userId)
    .eq('reviewee_id', revieweeId)
    .single()

  if (existingReview) {
    return res.status(400).json({ error: '이미 리뷰를 작성하셨습니다.' })
  }

  // 리뷰 작성 권한 확인
  // 보호자 → 간병인 리뷰 또는 간병인 → 보호자 리뷰만 가능
  const { data: application } = await supabase
    .from('applications')
    .select('caregiver_id')
    .eq('job_id', jobId)
    .eq('status', 'accepted')
    .single()

  if (!application) {
    return res.status(400).json({ error: '이 일자리에 대한 리뷰 권한이 없습니다.' })
  }

  const isGuardian = job.guardian_id === userId
  const isCaregiver = application.caregiver_id === userId

  if (!isGuardian && !isCaregiver) {
    return res.status(403).json({ error: '이 일자리에 대한 리뷰 권한이 없습니다.' })
  }

  // 리뷰 대상이 올바른지 확인
  if (isGuardian && revieweeId !== application.caregiver_id) {
    return res.status(400).json({ error: '간병인에게만 리뷰를 작성할 수 있습니다.' })
  }

  if (isCaregiver && revieweeId !== job.guardian_id) {
    return res.status(400).json({ error: '보호자에게만 리뷰를 작성할 수 있습니다.' })
  }

  // 리뷰 저장
  const { data: review, error } = await supabase
    .from('reviews')
    .insert({
      job_id: jobId,
      reviewer_id: userId,
      reviewee_id: revieweeId,
      rating,
      comment: comment || null,
    })
    .select(`
      *,
      reviewer:users!reviewer_id(id, name, avatar_url, role),
      reviewee:users!reviewee_id(id, name, avatar_url, role)
    `)
    .single()

  if (error) {
    console.error('Review create error:', error)
    return res.status(500).json({ error: '리뷰 작성에 실패했습니다.' })
  }

  return res.status(201).json({ success: true, review })
}
