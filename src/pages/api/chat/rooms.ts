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
    default:
      res.setHeader('Allow', ['GET'])
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

  // 역할에 따라 채팅방 조회
  const column = role === 'guardian' ? 'guardian_id' : 'caregiver_id'

  const { data: rooms, error } = await supabase
    .from('chat_rooms')
    .select(`
      *,
      job:job_postings(id, title, status),
      caregiver:users!caregiver_id(id, name, avatar_url),
      guardian:users!guardian_id(id, name, avatar_url),
      messages(
        id,
        content,
        sender_id,
        is_read,
        created_at
      )
    `)
    .eq(column, userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Chat rooms fetch error:', error)
    return res.status(500).json({ error: '채팅방 목록을 불러오는데 실패했습니다.' })
  }

  // 각 채팅방의 마지막 메시지와 읽지 않은 메시지 수 계산
  const roomsWithMeta = rooms?.map((room) => {
    const messages = room.messages || []
    const sortedMessages = messages.sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastMessage = sortedMessages[0] || null
    const unreadCount = messages.filter(
      (m: { is_read: boolean; sender_id: string }) =>
        !m.is_read && m.sender_id !== userId
    ).length

    return {
      ...room,
      lastMessage,
      unreadCount,
      messages: undefined, // 메시지 배열 제거
    }
  })

  return res.status(200).json({ rooms: roomsWithMeta })
}
