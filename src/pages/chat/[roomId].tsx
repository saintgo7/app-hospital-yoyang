import type { NextPage, GetServerSideProps } from 'next'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { Layout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { createServerClient, createBrowserClient } from '@/lib/supabase'
import type { ChatRoom, User, JobPosting, Message } from '@/types/database.types'

interface MessageWithSender extends Message {
  sender: Pick<User, 'id' | 'name' | 'avatar_url'>
}

interface Props {
  room: ChatRoom & {
    job: Pick<JobPosting, 'id' | 'title' | 'status'> | null
    caregiver: Pick<User, 'id' | 'name' | 'avatar_url'>
    guardian: Pick<User, 'id' | 'name' | 'avatar_url'>
  }
  initialMessages: MessageWithSender[]
  currentUserId: string
  role: 'caregiver' | 'guardian'
}

const ChatRoomPage: NextPage<Props> = ({
  room,
  initialMessages,
  currentUserId,
  role,
}) => {
  const [messages, setMessages] = useState<MessageWithSender[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const otherUser = role === 'guardian' ? room.caregiver : room.guardian

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    const supabase = createBrowserClient()

    // 실시간 메시지 구독
    const channel = supabase
      .channel(`room-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${room.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message

          // 자신이 보낸 메시지는 이미 추가됨
          if (newMsg.sender_id === currentUserId) return

          // 발신자 정보 조회
          const { data: sender } = await supabase
            .from('users')
            .select('id, name, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          if (sender) {
            setMessages((prev) => [
              ...prev,
              { ...newMsg, sender } as MessageWithSender,
            ])

            // 읽음 처리
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id, currentUserId])

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return

    const content = newMessage.trim()
    setNewMessage('')
    setIsSending(true)

    try {
      const response = await fetch(`/api/chat/rooms/${room.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...prev, data.message])
      } else {
        setNewMessage(content) // 실패 시 복원
      }
    } catch (error) {
      console.error('Send message error:', error)
      setNewMessage(content)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return

    setIsLoadingMore(true)
    const oldestMessage = messages[0]

    try {
      const response = await fetch(
        `/api/chat/rooms/${room.id}/messages?before=${oldestMessage.created_at}&limit=50`
      )

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) => [...data.messages, ...prev])
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error('Load more error:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  // 날짜별 메시지 그룹화
  const groupedMessages: { date: string; messages: MessageWithSender[] }[] = []
  let currentDate = ''

  messages.forEach((msg) => {
    const msgDate = new Date(msg.created_at).toDateString()
    if (msgDate !== currentDate) {
      currentDate = msgDate
      groupedMessages.push({ date: msg.created_at, messages: [msg] })
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg)
    }
  })

  return (
    <Layout title={`${otherUser.name}님과의 채팅`} hideHeader hideFooter>
      <div className="flex flex-col h-screen">
        {/* 헤더 */}
        <div className="bg-background border-b px-4 py-3 flex items-center gap-4">
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Button>
          </Link>

          <Avatar className="h-10 w-10">
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-base font-bold">{otherUser.name}</h1>
            {room.job && (
              <p className="text-sm text-muted-foreground">
                {room.job.title}
              </p>
            )}
          </div>
        </div>

        {/* 메시지 영역 */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        >
          {/* 더 불러오기 버튼 */}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadMoreMessages}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? '불러오는 중...' : '이전 메시지 보기'}
              </Button>
            </div>
          )}

          {groupedMessages.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* 날짜 구분선 */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted px-4 py-1 rounded-full">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(group.date)}
                  </span>
                </div>
              </div>

              {/* 메시지들 */}
              {group.messages.map((message) => {
                const isMe = message.sender_id === currentUserId

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 mb-3 ${
                      isMe ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {!isMe && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={message.sender.avatar_url || undefined} />
                        <AvatarFallback>
                          {message.sender.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-[70%] ${isMe ? 'text-right' : 'text-left'}`}
                    >
                      <div
                        className={`inline-block px-4 py-2 rounded-2xl ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        }`}
                      >
                        <p className="text-base whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isMe ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.created_at)}
                        </span>
                        {isMe && message.is_read && (
                          <span className="text-xs text-primary">읽음</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <div className="bg-background border-t px-4 py-3">
          <div className="flex items-end gap-3">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              className="min-h-[48px] max-h-[120px] text-base resize-none"
              rows={1}
              disabled={isSending}
            />
            <Button
              variant="guardian"
              size="lg"
              onClick={handleSend}
              disabled={!newMessage.trim() || isSending}
              className="shrink-0"
            >
              {isSending ? '전송중' : '전송'}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const { roomId } = context.params as { roomId: string }
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

  // 채팅방 정보 조회
  const { data: room, error: roomError } = await supabase
    .from('chat_rooms')
    .select(`
      *,
      job:job_postings(id, title, status),
      caregiver:users!caregiver_id(id, name, avatar_url),
      guardian:users!guardian_id(id, name, avatar_url)
    `)
    .eq('id', roomId)
    .single()

  if (roomError || !room) {
    return { notFound: true }
  }

  // 접근 권한 확인
  if (room.caregiver_id !== user.id && room.guardian_id !== user.id) {
    return { notFound: true }
  }

  // 메시지 조회
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      sender:users!sender_id(id, name, avatar_url)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(50)

  // 읽음 처리
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('room_id', roomId)
    .neq('sender_id', user.id)
    .eq('is_read', false)

  return {
    props: {
      room: room as Props['room'],
      initialMessages: (messages as MessageWithSender[]) || [],
      currentUserId: user.id,
      role: user.role,
    },
  }
}

export default ChatRoomPage
