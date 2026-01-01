import type { NextPage, GetServerSideProps } from 'next'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { createServerClient, createBrowserClient } from '@/lib/supabase'
import type { ChatRoom, User, JobPosting, Message } from '@/types/database.types'
import { getTimeAgo } from '@/lib/utils'

interface ChatRoomWithMeta extends ChatRoom {
  job: Pick<JobPosting, 'id' | 'title' | 'status'> | null
  caregiver: Pick<User, 'id' | 'name' | 'avatar_url'>
  guardian: Pick<User, 'id' | 'name' | 'avatar_url'>
  lastMessage: Pick<Message, 'id' | 'content' | 'sender_id' | 'created_at'> | null
  unreadCount: number
}

interface Props {
  rooms: ChatRoomWithMeta[]
  currentUserId: string
  role: 'caregiver' | 'guardian'
}

const ChatListPage: NextPage<Props> = ({ rooms: initialRooms, currentUserId, role }) => {
  const [rooms, setRooms] = useState(initialRooms)

  useEffect(() => {
    const supabase = createBrowserClient()

    // 실시간 메시지 구독
    const channel = supabase
      .channel('chat-rooms')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new as Message

          // 채팅방 목록 새로고침
          const response = await fetch('/api/chat/rooms')
          if (response.ok) {
            const data = await response.json()
            setRooms(data.rooms)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const getOtherUser = (room: ChatRoomWithMeta) => {
    return role === 'guardian' ? room.caregiver : room.guardian
  }

  return (
    <Layout title="채팅">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">채팅</h1>
          <p className="text-base text-muted-foreground">
            {role === 'guardian'
              ? '간병인과의 대화 목록입니다.'
              : '보호자와의 대화 목록입니다.'}
          </p>
        </div>

        {rooms.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-5xl mb-4">[...]</div>
              <p className="text-lg text-muted-foreground mb-2">
                아직 대화가 없습니다.
              </p>
              <p className="text-base text-muted-foreground">
                {role === 'guardian'
                  ? '지원자를 수락하면 채팅이 시작됩니다.'
                  : '지원이 수락되면 채팅이 시작됩니다.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => {
              const otherUser = getOtherUser(room)
              return (
                <Link key={room.id} href={`/chat/${room.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <Avatar className="h-14 w-14">
                            <AvatarImage src={otherUser.avatar_url || undefined} />
                            <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          {room.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {room.unreadCount > 9 ? '9+' : room.unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base font-bold truncate">
                              {otherUser.name}
                            </h3>
                            {room.job && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                {room.job.title.length > 10
                                  ? room.job.title.slice(0, 10) + '...'
                                  : room.job.title}
                              </Badge>
                            )}
                          </div>

                          {room.lastMessage ? (
                            <p className="text-sm text-muted-foreground truncate">
                              {room.lastMessage.sender_id === currentUserId && '나: '}
                              {room.lastMessage.content}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              대화를 시작해보세요
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          {room.lastMessage && (
                            <p className="text-sm text-muted-foreground">
                              {getTimeAgo(room.lastMessage.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  const supabase = createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', session.user.email!)
    .single()

  if (!user) {
    return {
      redirect: {
        destination: '/auth/complete-profile',
        permanent: false,
      },
    }
  }

  const column = user.role === 'guardian' ? 'guardian_id' : 'caregiver_id'

  const { data: rooms } = await supabase
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
    .eq(column, user.id)
    .order('updated_at', { ascending: false })

  const roomsWithMeta = rooms?.map((room) => {
    const messages = room.messages || []
    const sortedMessages = [...messages].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const lastMessage = sortedMessages[0] || null
    const unreadCount = messages.filter(
      (m: { is_read: boolean; sender_id: string }) =>
        !m.is_read && m.sender_id !== user.id
    ).length

    return {
      ...room,
      lastMessage,
      unreadCount,
      messages: undefined,
    }
  }) || []

  return {
    props: {
      rooms: roomsWithMeta as ChatRoomWithMeta[],
      currentUserId: user.id,
      role: user.role,
    },
  }
}

export default ChatListPage
