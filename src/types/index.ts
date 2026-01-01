// 사용자 타입
export type UserRole = 'caregiver' | 'guardian'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string
  profileImage?: string
  createdAt: Date
  updatedAt: Date
}

// 간병인 프로필
export interface CaregiverProfile {
  id: string
  userId: string
  experience: number // 경력 년수
  certifications: string[] // 자격증
  specialties: string[] // 전문 분야
  hourlyRate: number // 시급
  bio?: string // 자기소개
  available: boolean // 구직 가능 여부
  rating: number // 평균 평점
  reviewCount: number // 리뷰 수
}

// 보호자 프로필
export interface GuardianProfile {
  id: string
  userId: string
  patientRelation: string // 환자와의 관계
  patientAge?: number // 환자 나이
  patientCondition?: string // 환자 상태
}

// 구인글
export interface JobPosting {
  id: string
  guardianId: string
  title: string
  description: string
  location: string
  hospitalName?: string
  patientAge: number
  patientGender: 'male' | 'female'
  patientCondition: string
  careType: 'hospital' | 'home' | 'facility'
  startDate: Date
  endDate?: Date
  hourlyRate: number
  requirements?: string[]
  status: 'open' | 'closed' | 'in_progress' | 'completed'
  createdAt: Date
  updatedAt: Date
}

// 지원
export interface Application {
  id: string
  jobPostingId: string
  caregiverId: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn'
  createdAt: Date
  updatedAt: Date
}

// 채팅방
export interface ChatRoom {
  id: string
  jobPostingId?: string
  participants: string[]
  lastMessage?: string
  lastMessageAt?: Date
  createdAt: Date
}

// 메시지
export interface Message {
  id: string
  chatRoomId: string
  senderId: string
  content: string
  isRead: boolean
  createdAt: Date
}

// 리뷰
export interface Review {
  id: string
  jobPostingId: string
  reviewerId: string
  revieweeId: string
  rating: number
  comment?: string
  createdAt: Date
}
