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
  try {
    // 역할에 따라 채팅방 조회
    const column = role === 'guardian' ? 'guardian_id' : 'caregiver_id'

    // 채팅방 목록 조회
    const roomsResult = await query(
      `SELECT
        cr.*,
        json_build_object(
          'id', j.id,
          'title', j.title,
          'status', j.status
        ) as job,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'avatar_url', c.avatar_url
        ) as caregiver,
        json_build_object(
          'id', g.id,
          'name', g.name,
          'avatar_url', g.avatar_url
        ) as guardian
       FROM chat_rooms cr
       LEFT JOIN job_postings j ON cr.job_id = j.id
       LEFT JOIN users c ON cr.caregiver_id = c.id
       LEFT JOIN users g ON cr.guardian_id = g.id
       WHERE cr.${column} = $1
       ORDER BY cr.updated_at DESC`,
      [userId]
    )

    // 각 채팅방의 마지막 메시지와 읽지 않은 메시지 수 조회
    const roomsWithMeta = await Promise.all(
      roomsResult.rows.map(async (room: any) => {
        // 마지막 메시지 조회
        const lastMessageResult = await query(
          `SELECT id, content, sender_id, is_read, created_at
           FROM messages
           WHERE room_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [room.id]
        )

        // 읽지 않은 메시지 수 조회
        const unreadResult = await query(
          `SELECT COUNT(*) as count
           FROM messages
           WHERE room_id = $1 AND sender_id != $2 AND is_read = false`,
          [room.id, userId]
        )

        return {
          ...room,
          lastMessage: lastMessageResult.rows[0] || null,
          unreadCount: parseInt(unreadResult.rows[0].count, 10),
        }
      })
    )

    return res.status(200).json({ rooms: roomsWithMeta })
  } catch (error) {
    console.error('Chat rooms fetch error:', error)
    return res.status(500).json({ error: '채팅방 목록을 불러오는데 실패했습니다.' })
  }
}
