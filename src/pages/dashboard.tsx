import type { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './api/auth/[...nextauth]'

// 역할에 따라 적절한 대시보드로 리다이렉트
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/login',
        permanent: false,
      },
    }
  }

  if (!session.user.isProfileComplete) {
    return {
      redirect: {
        destination: '/auth/complete-profile',
        permanent: false,
      },
    }
  }

  const destination =
    session.user.role === 'caregiver'
      ? '/caregiver/dashboard'
      : '/guardian/dashboard'

  return {
    redirect: {
      destination,
      permanent: false,
    },
  }
}

export default function DashboardRedirect() {
  return null
}
