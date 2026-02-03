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

  if (session.user.role !== 'caregiver') {
    return res.status(403).json({ error: '간병인만 접근할 수 있습니다.' })
  }

  switch (req.method) {
    case 'GET':
      return handleGet(req, res, session.user.id)
    case 'PUT':
      return handlePut(req, res, session.user.id)
    default:
      res.setHeader('Allow', ['GET', 'PUT'])
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    // 사용자 정보 조회
    const userResult = await query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' })
    }

    // 프로필 조회
    const profileResult = await query(
      'SELECT * FROM caregiver_profiles WHERE user_id = $1',
      [userId]
    )

    return res.status(200).json({
      user: userResult.rows[0],
      profile: profileResult.rows[0] || null,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return res.status(500).json({ error: '프로필을 불러오는데 실패했습니다.' })
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  const {
    experienceYears,
    certifications,
    specializations,
    introduction,
    hourlyRate,
    isAvailable,
    location,
  } = req.body

  try {
    // 기존 프로필 확인
    const existingResult = await query(
      'SELECT id FROM caregiver_profiles WHERE user_id = $1',
      [userId]
    )

    let result
    if (existingResult.rows.length > 0) {
      // 업데이트
      result = await query(
        `UPDATE caregiver_profiles
         SET experience_years = $1,
             certifications = $2,
             specializations = $3,
             introduction = $4,
             hourly_rate = $5,
             is_available = $6,
             location = $7
         WHERE user_id = $8
         RETURNING *`,
        [
          experienceYears || 0,
          certifications || [],
          specializations || [],
          introduction || null,
          hourlyRate || null,
          isAvailable ?? true,
          location || null,
          userId,
        ]
      )
    } else {
      // 생성
      result = await query(
        `INSERT INTO caregiver_profiles (
          user_id, experience_years, certifications, specializations,
          introduction, hourly_rate, is_available, location
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          userId,
          experienceYears || 0,
          certifications || [],
          specializations || [],
          introduction || null,
          hourlyRate || null,
          isAvailable ?? true,
          location || null,
        ]
      )
    }

    return res.status(200).json({ success: true, profile: result.rows[0] })
  } catch (error) {
    console.error('Profile update error:', error)
    return res.status(500).json({ error: '프로필 저장에 실패했습니다.' })
  }
}
