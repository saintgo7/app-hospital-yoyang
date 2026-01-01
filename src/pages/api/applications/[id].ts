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
  const supabase = createServerClient()

  const { data: application, error } = await supabase
    .from('applications')
    .select(`
      *,
      caregiver:users!caregiver_id(
        id, name, avatar_url,
        caregiver_profile:caregiver_profiles(*)
      ),
      job:job_postings(
        *,
        guardian:users!guardian_id(id, name)
      )
    `)
    .eq('id', applicationId)
    .single()

  if (error || !application) {
    return res.status(404).json({ error: '지원 내역을 찾을 수 없습니다.' })
  }

  // 권한 확인: 지원자 본인 또는 구인글 작성자만 조회 가능
  const isCaregiver = application.caregiver_id === userId
  const isGuardian = application.job.guardian_id === userId

  if (!isCaregiver && !isGuardian) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' })
  }

  return res.status(200).json({ application })
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

  const supabase = createServerClient()

  // 지원 내역 조회 및 권한 확인
  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select(`
      *,
      job:job_postings(guardian_id)
    `)
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return res.status(404).json({ error: '지원 내역을 찾을 수 없습니다.' })
  }

  if (application.job.guardian_id !== userId) {
    return res.status(403).json({ error: '본인의 구인글에 대한 지원만 처리할 수 있습니다.' })
  }

  // 상태 업데이트
  const { data: updatedApplication, error } = await supabase
    .from('applications')
    .update({ status })
    .eq('id', applicationId)
    .select()
    .single()

  if (error) {
    console.error('Application update error:', error)
    return res.status(500).json({ error: '상태 변경에 실패했습니다.' })
  }

  // 수락된 경우 채팅방 생성
  if (status === 'accepted') {
    const { data: existingRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('caregiver_id', application.caregiver_id)
      .eq('guardian_id', userId)
      .single()

    if (!existingRoom) {
      await supabase.from('chat_rooms').insert({
        job_id: application.job_id,
        caregiver_id: application.caregiver_id,
        guardian_id: userId,
      })
    }
  }

  return res.status(200).json({ success: true, application: updatedApplication })
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

  const supabase = createServerClient()

  // 지원 내역 조회 및 권한 확인
  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (fetchError || !application) {
    return res.status(404).json({ error: '지원 내역을 찾을 수 없습니다.' })
  }

  if (application.caregiver_id !== userId) {
    return res.status(403).json({ error: '본인의 지원만 취소할 수 있습니다.' })
  }

  if (application.status !== 'pending') {
    return res.status(400).json({ error: '대기 중인 지원만 취소할 수 있습니다.' })
  }

  // 삭제
  const { error } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)

  if (error) {
    console.error('Application delete error:', error)
    return res.status(500).json({ error: '지원 취소에 실패했습니다.' })
  }

  return res.status(200).json({ success: true })
}
