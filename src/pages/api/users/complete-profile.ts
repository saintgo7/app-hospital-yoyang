import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { query, transaction } from '@/lib/db'

interface CompleteProfileBody {
  email: string
  name: string
  phone: string
  role: 'caregiver' | 'guardian'
  avatarUrl?: string
  introduction?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }

  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }

  const body = req.body as CompleteProfileBody

  // 유효성 검사
  if (!body.name || body.name.trim().length < 2) {
    return res.status(400).json({ error: '이름을 2자 이상 입력해주세요.' })
  }

  if (!body.phone || !/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/.test(body.phone.replace(/-/g, ''))) {
    return res.status(400).json({ error: '올바른 전화번호를 입력해주세요.' })
  }

  if (!['caregiver', 'guardian'].includes(body.role)) {
    return res.status(400).json({ error: '올바른 역할을 선택해주세요.' })
  }

  try {
    // 트랜잭션으로 사용자 생성 및 간병인 프로필 생성
    const result = await transaction(async (client) => {
      // 사용자 생성
      const userResult = await client.query<{
        id: string
        email: string
        name: string
        role: string
      }>(
        `INSERT INTO users (email, name, phone, role, avatar_url, email_verified)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, email, name, role`,
        [
          session.user.email,
          body.name.trim(),
          body.phone.replace(/-/g, ''),
          body.role,
          body.avatarUrl || null,
        ]
      )

      const user = userResult.rows[0]

      // 간병인인 경우 프로필 생성
      if (body.role === 'caregiver') {
        await client.query(
          `INSERT INTO caregiver_profiles (user_id, introduction, is_available)
           VALUES ($1, $2, $3)`,
          [user.id, body.introduction || null, true]
        )
      }

      return user
    })

    return res.status(200).json({
      success: true,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
    })
  } catch (error: any) {
    console.error('Complete profile error:', error)

    // PostgreSQL unique constraint violation
    if (error.code === '23505') {
      return res.status(400).json({ error: '이미 가입된 이메일입니다.' })
    }

    return res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' })
  }
}
