import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]'
import { query } from '@/lib/db'

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
  const { before, after, limit = '50' } = req.query

  try {
    // 채팅방 접근 권한 확인
    const roomResult = await query<{
      id: string
      caregiver_id: string
      guardian_id: string
    }>(
      'SELECT id, caregiver_id, guardian_id FROM chat_rooms WHERE id = $1',
      [roomId]
    )

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' })
    }

    const room = roomResult.rows[0]

    if (room.caregiver_id !== userId && room.guardian_id !== userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' })
    }

    // 메시지 조회
    const params: any[] = [roomId, parseInt(limit as string, 10)]
    let timeCondition = ''

    if (before) {
      params.push(before as string)
      timeCondition = `AND m.created_at < $${params.length}`
    } else if (after) {
      params.push(after as string)
      timeCondition = `AND m.created_at > $${params.length}`
    }

    const messagesResult = await query(
      `SELECT
        m.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as sender
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = $1 ${timeCondition}
       ORDER BY m.created_at ${after ? 'ASC' : 'DESC'}
       LIMIT $2`,
      params
    )

    // 읽지 않은 메시지 읽음 처리 (after 쿼리가 아닐 때만)
    if (!after) {
      await query(
        `UPDATE messages
         SET is_read = true
         WHERE room_id = $1 AND sender_id != $2 AND is_read = false`,
        [roomId, userId]
      )
    }

    const messages = after ? messagesResult.rows : messagesResult.rows.reverse()

    return res.status(200).json({
      messages,
      hasMore: messagesResult.rows.length === parseInt(limit as string, 10),
    })
  } catch (error) {
    console.error('Messages fetch error:', error)
    return res.status(500).json({ error: '메시지를 불러오는데 실패했습니다.' })
  }
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

  try {
    // 채팅방 접근 권한 확인
    const roomResult = await query<{
      id: string
      caregiver_id: string
      guardian_id: string
    }>(
      'SELECT id, caregiver_id, guardian_id FROM chat_rooms WHERE id = $1',
      [roomId]
    )

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' })
    }

    const room = roomResult.rows[0]

    if (room.caregiver_id !== userId && room.guardian_id !== userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' })
    }

    // 메시지 저장
    const messageResult = await query(
      'INSERT INTO messages (room_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *',
      [roomId, userId, content.trim()]
    )

    // Sender 정보 조회
    const fullMessageResult = await query(
      `SELECT
        m.*,
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar_url', u.avatar_url
        ) as sender
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1`,
      [messageResult.rows[0].id]
    )

    // 채팅방 updated_at 갱신
    await query('UPDATE chat_rooms SET updated_at = NOW() WHERE id = $1', [roomId])

    return res.status(201).json({ success: true, message: fullMessageResult.rows[0] })
  } catch (error) {
    console.error('Message create error:', error)
    return res.status(500).json({ error: '메시지 전송에 실패했습니다.' })
  }
}
