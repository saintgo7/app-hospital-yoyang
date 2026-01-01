import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { createServerClient } from '@/lib/supabase'

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
  const supabase = createServerClient()

  const { data: job, error } = await supabase
    .from('job_postings')
    .select(`
      *,
      applications(
        *,
        caregiver:users!caregiver_id(
          *,
          caregiver_profile:caregiver_profiles(*)
        )
      )
    `)
    .eq('id', jobId)
    .eq('guardian_id', userId)
    .single()

  if (error || !job) {
    return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
  }

  return res.status(200).json({ job })
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  jobId: string,
  userId: string
) {
  const { status, title, description, location, careType, startDate, endDate, hourlyRate, patientInfo } = req.body
  const supabase = createServerClient()

  // 권한 확인
  const { data: existingJob } = await supabase
    .from('job_postings')
    .select('id')
    .eq('id', jobId)
    .eq('guardian_id', userId)
    .single()

  if (!existingJob) {
    return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
  }

  type JobStatus = 'open' | 'closed' | 'in_progress' | 'completed'

  const updateData: Record<string, unknown> = {}

  if (status && ['open', 'closed', 'in_progress', 'completed'].includes(status)) {
    updateData.status = status as JobStatus
  }
  if (title) updateData.title = title
  if (description) updateData.description = description
  if (location) updateData.location = location
  if (careType) updateData.care_type = careType
  if (startDate) updateData.start_date = startDate
  if (endDate !== undefined) updateData.end_date = endDate
  if (hourlyRate) updateData.hourly_rate = hourlyRate
  if (patientInfo) updateData.patient_info = patientInfo

  const { data: job, error } = await supabase
    .from('job_postings')
    .update(updateData)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    console.error('Job update error:', error)
    return res.status(500).json({ error: '구인글 수정에 실패했습니다.' })
  }

  return res.status(200).json({ success: true, job })
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  jobId: string,
  userId: string
) {
  const supabase = createServerClient()

  // 권한 확인
  const { data: existingJob } = await supabase
    .from('job_postings')
    .select('id, status')
    .eq('id', jobId)
    .eq('guardian_id', userId)
    .single()

  if (!existingJob) {
    return res.status(404).json({ error: '구인글을 찾을 수 없습니다.' })
  }

  // 진행 중인 구인글은 삭제 불가
  if (existingJob.status === 'in_progress') {
    return res.status(400).json({ error: '진행 중인 구인글은 삭제할 수 없습니다.' })
  }

  const { error } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', jobId)

  if (error) {
    console.error('Job delete error:', error)
    return res.status(500).json({ error: '구인글 삭제에 실패했습니다.' })
  }

  return res.status(200).json({ success: true })
}
