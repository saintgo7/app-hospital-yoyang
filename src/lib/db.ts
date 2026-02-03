/**
 * PostgreSQL Database Connection
 * @description pg 라이브러리를 사용한 PostgreSQL 연결
 */

import { Pool, PoolClient, QueryResult } from 'pg'

// Database connection pool
let pool: Pool | null = null

/**
 * Get PostgreSQL connection pool
 * @description 싱글톤 패턴으로 connection pool 관리
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // 최대 연결 수
      idleTimeoutMillis: 30000, // 유휴 연결 타임아웃
      connectionTimeoutMillis: 2000, // 연결 타임아웃
    })

    // 에러 핸들링
    pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err)
    })
  }

  return pool
}

/**
 * Execute a single query
 * @description 단일 쿼리 실행
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<any>> {
  const pool = getPool()
  const start = Date.now()

  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start

    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount })
    }

    return res
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

/**
 * Get a client from the pool (for transactions)
 * @description 트랜잭션용 클라이언트 가져오기
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return pool.connect()
}

/**
 * Execute a transaction
 * @description 트랜잭션 실행 헬퍼
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Close the database pool
 * @description 데이터베이스 연결 종료 (앱 종료 시)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Process exit 시 pool 정리
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    if (pool) {
      pool.end()
    }
  })
}

/**
 * Helper: Check database connection
 * @description 데이터베이스 연결 확인
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()')
    return result.rows.length > 0
  } catch (error) {
    console.error('Database connection check failed:', error)
    return false
  }
}
