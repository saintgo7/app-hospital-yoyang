/**
 * Server-side caching utilities
 * Following Vercel best practices: server-cache-react, server-cache-lru
 */

import { cache } from 'react'
import { createServerClient } from './supabase'

type JobStatus = 'open' | 'closed' | 'in_progress' | 'completed'

/**
 * React cache wrapper for per-request deduplication
 * Multiple calls within the same request will return the same result
 */
export const getJobPostings = cache(async (status: JobStatus = 'open') => {
  const supabase = createServerClient()

  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select(`
      *,
      guardian:users!guardian_id(id, name, avatar_url)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Jobs fetch error:', error)
    return []
  }

  return jobs || []
})

/**
 * Cache user profile with React cache
 */
export const getUserProfile = cache(async (userId: string) => {
  const supabase = createServerClient()

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('User fetch error:', error)
    return null
  }

  return user
})

/**
 * Cache job applications
 */
export const getJobApplications = cache(async (jobId: string) => {
  const supabase = createServerClient()

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      *,
      caregiver:users!caregiver_id(id, name, avatar_url)
    `)
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Applications fetch error:', error)
    return []
  }

  return applications || []
})

/**
 * Simple LRU cache implementation for cross-request caching
 * Use for data that doesn't change frequently
 */
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private maxSize: number
  private ttl: number

  constructor(maxSize: number = 100, ttl: number = 60000) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, item)

    return item.value
  }

  set(key: string, value: T): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

// Global LRU cache for static data (locations, job types, etc.)
const staticDataCache = new LRUCache<string[]>(50, 300000) // 5 minutes TTL

export const getCachedLocations = async (): Promise<string[]> => {
  const cacheKey = 'locations'
  const cached = staticDataCache.get(cacheKey)
  if (cached) return cached

  const supabase = createServerClient()
  const { data: jobs } = await supabase
    .from('job_postings')
    .select('location')

  const locations = Array.from(
    new Set((jobs || []).map((job: any) => job.location?.split(' ')[0] || ''))
  ).filter(Boolean).sort()

  staticDataCache.set(cacheKey, locations)
  return locations
}
