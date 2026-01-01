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
  const supabase = createServerClient()

  if (role === 'caregiver') {
    // 간병인: 내 지원 목록
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        *,
        job:job_postings(
          *,
          guardian:users!guardian_id(id, name)
        )
      `)
      .eq('caregiver_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Applications fetch error:', error)
      return res.status(500).json({ error: '지원 내역을 불러오는데 실패했습니다.' })
    }

    return res.status(200).json({ applications })
  } else {
    // 보호자: 내 구인글에 대한 지원 목록
    const { jobId } = req.query

    let query = supabase
      .from('applications')
      .select(`
        *,
        caregiver:users!caregiver_id(
          id, name, avatar_url,
          caregiver_profile:caregiver_profiles(*)
        ),
        job:job_postings(*)
      `)
      .order('created_at', { ascending: false })

    if (jobId) {
      query = query.eq('job_id', jobId as string)
    }

    const { data: applications, error } = await query

    if (error) {
      console.error('Applications fetch error:', error)
      return res.status(500).json({ error: '지원 내역을 불러오는데 실패했습니다.' })
    }

    // 보호자의 구인글에 대한 지원만 필터링
    const { data: myJobs } = await supabase
      .from('job_postings')
      .select('id')
      .eq('guardian_id', userId)

    const myJobIds = new Set(myJobs?.map((j) => j.id) || [])
    const filteredApplications = applications?.filter((a) => myJobIds.has(a.job_id)) || []

    return res.status(200).json({ applications: filteredApplications })
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

  const supabase = createServerClient()

  // 구인글 존재 여부 확인
  const { data: job, error: jobError } = await supabase
    .from('job_postings')
    .select('id, status')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
  }

  if (job.status !== 'open') {
    return res.status(400).json({ error: '마감된 구인글입니다.' })
  }

  // 중복 지원 확인
  const { data: existingApplication } = await supabase
    .from('applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('caregiver_id', caregiverId)
    .single()

  if (existingApplication) {
    return res.status(400).json({ error: '이미 지원한 구인글입니다.' })
  }

  // 지원 생성
  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      job_id: jobId,
      caregiver_id: caregiverId,
      message: message || null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('Application creation error:', error)
    return res.status(500).json({ error: '지원에 실패했습니다.' })
  }

  return res.status(201).json({ success: true, application })
}
