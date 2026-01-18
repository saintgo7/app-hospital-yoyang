import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { createServerClient } from '@/lib/supabase'

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
  const supabase = createServerClient()

  type JobStatus = 'open' | 'closed' | 'in_progress' | 'completed'
  const validStatus = ['open', 'closed', 'in_progress', 'completed'].includes(status as string)
    ? (status as JobStatus)
    : 'open'

  let query = supabase
    .from('job_postings')
    .select(`
      *,
      guardian:users!guardian_id(id, name, avatar_url)
    `)
    .eq('status', validStatus)
    .order('created_at', { ascending: false })

  if (location) {
    query = query.ilike('location', `%${location}%`)
  }

  if (careType) {
    query = query.eq('care_type', careType as string)
  }

  const { data: jobs, error } = await query

  if (error) {
    console.error('Jobs fetch error:', error)
    return res.status(500).json({ error: '구인글을 불러오는데 실패했습니다.' })
  }

  return res.status(200).json({ jobs })
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

  const supabase = createServerClient()

  const { data: job, error } = await supabase
    .from('job_postings')
    .insert({
      guardian_id: userId,
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      care_type: careType,
      start_date: startDate,
      end_date: endDate || null,
      hourly_rate: hourlyRate,
      patient_info: patientInfo || {},
      status: 'open',
    })
    .select()
    .single()

  if (error) {
    console.error('Job creation error:', error)
    return res.status(500).json({ error: '구인글 등록에 실패했습니다.' })
  }

  return res.status(201).json({ success: true, job })
}
