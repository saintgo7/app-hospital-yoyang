import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { createServerClient } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }

  const { roomId } = req.query as { roomId: string }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, roomId, session.user.id)
    case 'POST':
      return handlePost(req, res, roomId, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'POST'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  roomId: string,
  userId: string
) {
  const supabase = createServerClient()
  const { before, limit = '50' } = req.query

  // 채팅방 접근 권한 확인
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select('id, caregiver_id, guardian_id')
    .eq('id', roomId)
    .single()

  if (roomError || !room) {
    return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' })
  }

  if (room.caregiver_id !== userId && room.guardian_id !== userId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' })
  }

  // 메시지 조회
  let query = supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(id, name, avatar_url)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string, 10))

  if (before) {
    query = query.lt('created_at', before as string)
  }

  const { data: messages, error } = await query

  if (error) {
    console.error('Messages fetch error:', error)
    return res.status(500).json({ error: '메시지를 불러오는데 실패했습니다.' })
  }

  // 읽지 않은 메시지 읽음 처리
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('room_id', roomId)
    .neq('sender_id', userId)
    .eq('is_read', false)

  return res.status(200).json({
    messages: messages?.reverse() || [],
    hasMore: messages?.length === parseInt(limit as string, 10),
  })
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  roomId: string,
  userId: string
) {
  const { content } = req.body

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: '메시지 내용이 필요합니다.' })
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: '메시지는 1000자 이내로 작성해주세요.' })
  }

  const supabase = createServerClient()

  // 채팅방 접근 권한 확인
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select('id, caregiver_id, guardian_id')
    .eq('id', roomId)
    .single()

  if (roomError || !room) {
    return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' })
  }

  if (room.caregiver_id !== userId && room.guardian_id !== userId) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' })
  }

  // 메시지 저장
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      sender_id: userId,
      content: content.trim(),
    })
    .select(`
      *,
      sender:users!sender_id(id, name, avatar_url)
    `)
    .single()

  if (error) {
    console.error('Message create error:', error)
    return res.status(500).json({ error: '메시지 전송에 실패했습니다.' })
  }

  // 채팅방 updated_at 갱신
  await supabase
    .from('chat_rooms')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', roomId)

  return res.status(201).json({ success: true, message })
}
