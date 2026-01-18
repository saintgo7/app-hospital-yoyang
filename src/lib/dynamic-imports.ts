/**
 * Dynamic imports for bundle size optimization
 * Following Vercel best practices: bundle-dynamic-imports
 */

import dynamic from 'next/dynamic'

// Lazy load heavy components
export const DynamicChatRoom = dynamic(
  () => import('@/pages/chat/[roomId]'),
  {
    loading: () => null,
    ssr: false, // Chat features don't need SSR
  }
)

// Lazy load review form (only loaded when user writes review)
export const DynamicReviewForm = dynamic(
  () => import('@/components/common/ReviewForm').then(mod => mod.ReviewForm),
  {
    loading: () => null,
  }
)

// Lazy load caregiver profile (only loaded when viewing profile)
export const DynamicCaregiverProfile = dynamic(
  () => import('@/pages/caregiver/profile'),
  {
    loading: () => null,
  }
)
