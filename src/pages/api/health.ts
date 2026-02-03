import type { NextApiRequest, NextApiResponse } from 'next'
import { checkConnection } from '@/lib/db'

/**
 * Health Check Endpoint
 * @description Docker healthcheck 및 모니터링용
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    // 데이터베이스 연결 확인
    const dbHealthy = await checkConnection()

    if (!dbHealthy) {
      return res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      })
    }

    return res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    })
  }
}
