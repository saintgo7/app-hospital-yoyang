import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { createServerClient } from '@/lib/supabase'

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
    const supabase = createServerClient()

    // 사용자 생성
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email: session.user.email,
        name: body.name.trim(),
        phone: body.phone.replace(/-/g, ''),
        role: body.role,
        avatar_url: body.avatarUrl || null,
      })
      .select()
      .single()

    if (userError) {
      console.error('User creation error:', userError)

      if (userError.code === '23505') {
        return res.status(400).json({ error: '이미 가입된 이메일입니다.' })
      }
      throw userError
    }

    // 간병인인 경우 프로필 생성
    if (body.role === 'caregiver') {
      const { error: profileError } = await supabase
        .from('caregiver_profiles')
        .insert({
          user_id: user.id,
          introduction: body.introduction || null,
          is_available: true,
        })

      if (profileError) {
        console.error('Caregiver profile creation error:', profileError)
        // 롤백을 위해 사용자 삭제
        await supabase.from('users').delete().eq('id', user.id)
        throw profileError
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('Complete profile error:', error)
    return res.status(500).json({ error: '프로필 저장 중 오류가 발생했습니다.' })
  }
}
