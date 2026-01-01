/**
 * Supabase Database 타입 정의
 * @description supabase gen types typescript로 자동 생성 예정
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          phone: string | null
          role: 'caregiver' | 'guardian'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          phone?: string | null
          role: 'caregiver' | 'guardian'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          role?: 'caregiver' | 'guardian'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      caregiver_profiles: {
        Row: {
          id: string
          user_id: string
          experience_years: number
          certifications: string[]
          specializations: string[]
          introduction: string | null
          hourly_rate: number | null
          is_available: boolean
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          experience_years?: number
          certifications?: string[]
          specializations?: string[]
          introduction?: string | null
          hourly_rate?: number | null
          is_available?: boolean
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          experience_years?: number
          certifications?: string[]
          specializations?: string[]
          introduction?: string | null
          hourly_rate?: number | null
          is_available?: boolean
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'caregiver_profiles_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      job_postings: {
        Row: {
          id: string
          guardian_id: string
          title: string
          description: string
          location: string
          patient_info: Json
          care_type: string
          start_date: string
          end_date: string | null
          hourly_rate: number
          status: 'open' | 'closed' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          guardian_id: string
          title: string
          description: string
          location: string
          patient_info?: Json
          care_type: string
          start_date: string
          end_date?: string | null
          hourly_rate: number
          status?: 'open' | 'closed' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          guardian_id?: string
          title?: string
          description?: string
          location?: string
          patient_info?: Json
          care_type?: string
          start_date?: string
          end_date?: string | null
          hourly_rate?: number
          status?: 'open' | 'closed' | 'in_progress' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'job_postings_guardian_id_fkey'
            columns: ['guardian_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      applications: {
        Row: {
          id: string
          job_id: string
          caregiver_id: string
          message: string | null
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          caregiver_id: string
          message?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          caregiver_id?: string
          message?: string | null
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'applications_job_id_fkey'
            columns: ['job_id']
            referencedRelation: 'job_postings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'applications_caregiver_id_fkey'
            columns: ['caregiver_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      chat_rooms: {
        Row: {
          id: string
          job_id: string | null
          caregiver_id: string
          guardian_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          caregiver_id: string
          guardian_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          caregiver_id?: string
          guardian_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_rooms_job_id_fkey'
            columns: ['job_id']
            referencedRelation: 'job_postings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_rooms_caregiver_id_fkey'
            columns: ['caregiver_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_rooms_guardian_id_fkey'
            columns: ['guardian_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          room_id: string
          sender_id: string
          content: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          sender_id: string
          content: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          sender_id?: string
          content?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_room_id_fkey'
            columns: ['room_id']
            referencedRelation: 'chat_rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      reviews: {
        Row: {
          id: string
          job_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_job_id_fkey'
            columns: ['job_id']
            referencedRelation: 'job_postings'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_reviewer_id_fkey'
            columns: ['reviewer_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_reviewee_id_fkey'
            columns: ['reviewee_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'caregiver' | 'guardian'
      job_status: 'open' | 'closed' | 'in_progress' | 'completed'
      application_status: 'pending' | 'accepted' | 'rejected'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 편의 타입
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

// 엔티티 타입
export type User = Tables<'users'>
export type CaregiverProfile = Tables<'caregiver_profiles'>
export type JobPosting = Tables<'job_postings'>
export type Application = Tables<'applications'>
export type ChatRoom = Tables<'chat_rooms'>
export type Message = Tables<'messages'>
export type Review = Tables<'reviews'>
