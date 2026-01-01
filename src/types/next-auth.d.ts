import 'next-auth'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'caregiver' | 'guardian'
      phone?: string
      isProfileComplete: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role: 'caregiver' | 'guardian'
    phone?: string
    isProfileComplete: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'caregiver' | 'guardian'
    phone?: string
    isProfileComplete: boolean
  }
}
