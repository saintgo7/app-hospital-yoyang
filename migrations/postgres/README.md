# PostgreSQL 마이그레이션

> Supabase에서 PostgreSQL로 변환된 스키마

## 파일 목록

| 파일 | 설명 | 필수 여부 |
|------|------|----------|
| `01_initial_schema.sql` | 초기 스키마 (테이블, 인덱스, 트리거) | ✅ 필수 |
| `02_seed_data.sql` | 샘플 데이터 (테스트용) | ⚠️ 개발/테스트만 |

## 주요 변경사항

### Supabase → PostgreSQL 변환

| 항목 | Supabase | PostgreSQL |
|------|----------|-----------|
| **Auth** | Supabase Auth (`auth.uid()`) | NextAuth + sessions 테이블 |
| **RLS** | Row Level Security | Application Level 권한 체크 |
| **Realtime** | Supabase Realtime | 제거 (Polling 사용) |
| **Users** | `auth.users` | `public.users` + NextAuth 테이블 |

### 추가된 테이블

- `accounts`: NextAuth OAuth 계정 정보
- `sessions`: NextAuth 세션 정보
- `verification_tokens`: 이메일 인증 (선택)

### 제거된 기능

- ❌ Supabase Realtime (ALTER PUBLICATION)
- ❌ RLS 정책 (auth.uid() 사용 불가)
- ❌ Supabase Auth 의존성

## 실행 방법

### 로컬 PostgreSQL (개발/테스트)

```bash
# 1. PostgreSQL 데이터베이스 생성
createdb carematch_v3

# 2. 스키마 생성
psql carematch_v3 < migrations/postgres/01_initial_schema.sql

# 3. 샘플 데이터 삽입 (선택)
psql carematch_v3 < migrations/postgres/02_seed_data.sql

# 4. 확인
psql carematch_v3 -c "\dt"
```

### ws-248-247 서버 (프로덕션)

```bash
# SSH 접속
ssh ws-248-247

# 데이터베이스 생성
sudo -u postgres psql -c "CREATE DATABASE carematch_v3;"

# 스키마 적용
sudo -u postgres psql carematch_v3 < /data/blackpc/app-care/carematch-v3/migrations/postgres/01_initial_schema.sql

# ⚠️ 프로덕션에서는 seed data 실행하지 않음!

# 확인
sudo -u postgres psql carematch_v3 -c "\dt"
```

## 테이블 구조

### 핵심 테이블

```
users (사용자)
├── accounts (OAuth 계정)
└── sessions (세션)

users (간병인)
└── caregiver_profiles (프로필)

users (보호자)
└── job_postings (구인글)
    ├── applications (지원)
    └── chat_rooms (채팅방)
        └── messages (메시지)

job_postings
└── reviews (리뷰)
```

## 마이그레이션 검증

```sql
-- 테이블 목록 확인
\dt

-- 테이블별 레코드 수
SELECT
  schemaname,
  tablename,
  n_tup_ins - n_tup_del as row_count
FROM pg_stat_user_tables
ORDER BY tablename;

-- 인덱스 확인
\di

-- 뷰 확인
\dv

-- 통계 확인
SELECT * FROM user_stats;
SELECT * FROM job_stats;
```

## 롤백 방법

```bash
# 전체 데이터베이스 삭제
dropdb carematch_v3

# 또는 특정 테이블만 삭제
psql carematch_v3 -c "DROP TABLE IF EXISTS messages, chat_rooms, reviews, applications, job_postings, caregiver_profiles, verification_tokens, sessions, accounts, users CASCADE;"
```

## 백업 방법

```bash
# 스키마만 백업
pg_dump -s carematch_v3 > schema_backup.sql

# 데이터 포함 전체 백업
pg_dump carematch_v3 > full_backup.sql

# 특정 테이블만 백업
pg_dump -t users -t job_postings carematch_v3 > tables_backup.sql
```

## 주의사항

1. **프로덕션 배포 전 테스트 필수**
   - 로컬에서 먼저 테스트
   - 모든 API 엔드포인트 동작 확인

2. **Seed data는 개발용**
   - 프로덕션에서 실행 금지
   - 테스트 계정 포함

3. **백업 필수**
   - 마이그레이션 전 기존 데이터 백업
   - 롤백 계획 수립

4. **RLS 제거**
   - API 라우트에서 세션 확인 필수
   - 권한 체크 로직 구현 필요

## 다음 단계

- [ ] 로컬에서 마이그레이션 테스트
- [ ] API 라우트에서 권한 체크 구현
- [ ] NextAuth 설정 완료
- [ ] 프로덕션 배포

---

*마지막 업데이트: 2026-02-03*
