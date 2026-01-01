# 🗄️ AGENT-DATABASE: 데이터베이스 에이전트

> **역할**: CareMatch V3의 데이터베이스 설계 및 관리 담당
> **기술**: Supabase PostgreSQL, RLS, Migrations
> **핵심 원칙**: 데이터 무결성, 보안, 성능

---

## 📋 에이전트 정보

| 항목 | 내용 |
|------|------|
| **이름** | Database Agent |
| **역할** | DB 설계 및 관리 |
| **담당** | 스키마, RLS, 마이그레이션, 최적화 |
| **호출** | `@database` |

---

## 🎯 핵심 책임

### 1. 스키마 설계
- 테이블 설계 및 관계 정의
- 인덱스 최적화
- 타입 정의

### 2. 보안 정책 (RLS)
- Row Level Security 정책
- 역할별 접근 제어
- 데이터 보호

### 3. 마이그레이션 관리
- 버전 관리
- 롤백 계획
- 데이터 마이그레이션

---

## 📁 담당 디렉토리

```
supabase/
├── migrations/
│   ├── 00001_create_profiles.sql
│   ├── 00002_create_job_postings.sql
│   ├── 00003_create_applications.sql
│   ├── 00004_create_chat_rooms.sql
│   ├── 00005_create_messages.sql
│   ├── 00006_create_reviews.sql
│   ├── 00007_create_certificates.sql
│   ├── 00008_create_notifications.sql
│   └── 00009_add_rls_policies.sql
├── seed.sql                    # 초기 데이터
└── types.ts                    # 타입 정의 (자동 생성)
```

---

## 📊 데이터베이스 스키마

### ERD 다이어그램
```
┌─────────────────┐       ┌─────────────────┐
│    profiles     │       │  job_postings   │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │───┐   │ id (PK)         │
│ user_id (FK)    │   │   │ guardian_id(FK) │──┐
│ role            │   │   │ title           │  │
│ name            │   │   │ description     │  │
│ phone           │   │   │ location        │  │
│ ...             │   │   │ ...             │  │
└─────────────────┘   │   └─────────────────┘  │
                      │                         │
                      │   ┌─────────────────┐  │
                      │   │  applications   │  │
                      │   ├─────────────────┤  │
                      │   │ id (PK)         │  │
                      └──▶│ caregiver_id    │  │
                          │ job_id (FK)     │◀─┘
                          │ status          │
                          │ ...             │
                          └─────────────────┘
```

### 테이블 정의

#### 1. profiles (사용자 프로필)
```sql
-- 00001_create_profiles.sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK (role IN ('caregiver', 'guardian')),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255),
  profile_image TEXT,
  address TEXT,
  address_detail TEXT,
  
  -- 간병인 전용 필드
  birth_date DATE,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
  experience_years INTEGER DEFAULT 0,
  introduction TEXT,
  available_areas TEXT[],
  preferred_care_types TEXT[],
  hourly_rate INTEGER,
  
  -- 보호자 전용 필드
  patient_relation VARCHAR(50),
  
  -- 상태
  is_profile_complete BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- 업데이트 트리거
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### 2. job_postings (구인글)
```sql
-- 00002_create_job_postings.sql
CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  
  -- 근무 조건
  location TEXT NOT NULL,
  location_detail TEXT,
  salary VARCHAR(100) NOT NULL,
  salary_type VARCHAR(20) CHECK (salary_type IN ('hourly', 'daily', 'monthly')),
  working_hours TEXT NOT NULL,
  working_days TEXT[],
  
  -- 환자 정보
  patient_gender VARCHAR(10) CHECK (patient_gender IN ('male', 'female', 'any')),
  patient_age INTEGER,
  care_type VARCHAR(20) CHECK (care_type IN ('hospital', 'home', 'facility')),
  disease_info TEXT,
  special_notes TEXT,
  
  -- 기간
  start_date DATE NOT NULL,
  end_date DATE,
  is_long_term BOOLEAN DEFAULT FALSE,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('draft', 'active', 'paused', 'closed', 'completed')),
  view_count INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_job_postings_guardian_id ON job_postings(guardian_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

-- 전문 검색 인덱스
CREATE INDEX idx_job_postings_search ON job_postings 
  USING gin(to_tsvector('korean', title || ' ' || description || ' ' || location));
```

#### 3. applications (지원)
```sql
-- 00003_create_applications.sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
  caregiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 지원 내용
  cover_letter TEXT,
  expected_salary VARCHAR(100),
  available_start_date DATE,
  
  -- 상태
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected', 'withdrawn')),
  
  -- 메모 (보호자용)
  guardian_memo TEXT,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 중복 지원 방지
  UNIQUE(job_id, caregiver_id)
);

-- 인덱스
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_caregiver_id ON applications(caregiver_id);
CREATE INDEX idx_applications_status ON applications(status);
```

#### 4. chat_rooms (채팅방)
```sql
-- 00004_create_chat_rooms.sql
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  
  -- 참여자
  caregiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 마지막 메시지
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  
  -- 읽지 않은 메시지 수
  caregiver_unread_count INTEGER DEFAULT 0,
  guardian_unread_count INTEGER DEFAULT 0,
  
  -- 상태
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 중복 방지
  UNIQUE(caregiver_id, guardian_id, job_id)
);

-- 인덱스
CREATE INDEX idx_chat_rooms_caregiver_id ON chat_rooms(caregiver_id);
CREATE INDEX idx_chat_rooms_guardian_id ON chat_rooms(guardian_id);
CREATE INDEX idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);
```

#### 5. messages (메시지)
```sql
-- 00005_create_messages.sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- 메시지 내용
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text'
    CHECK (message_type IN ('text', 'image', 'file', 'system')),
  
  -- 읽음 상태
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

#### 6. reviews (리뷰)
```sql
-- 00006_create_reviews.sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  
  -- 리뷰 작성자/대상
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 리뷰 타입 (간병인→보호자, 보호자→간병인)
  review_type VARCHAR(20) CHECK (review_type IN ('caregiver_to_guardian', 'guardian_to_caregiver')),
  
  -- 평가
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  
  -- 세부 평점 (간병인 평가용)
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  skill_rating INTEGER CHECK (skill_rating >= 1 AND skill_rating <= 5),
  attitude_rating INTEGER CHECK (attitude_rating >= 1 AND attitude_rating <= 5),
  
  -- 상태
  is_public BOOLEAN DEFAULT TRUE,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 한 근무에 하나의 리뷰만
  UNIQUE(job_id, reviewer_id, reviewee_id)
);

-- 인덱스
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

#### 7. certificates (자격증)
```sql
-- 00007_create_certificates.sql
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- 자격증 정보
  name VARCHAR(100) NOT NULL,
  issuer VARCHAR(100) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  certificate_number VARCHAR(100),
  
  -- 파일
  image_url TEXT,
  
  -- 검증 상태
  verification_status VARCHAR(20) DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- 메타
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_certificates_caregiver_id ON certificates(caregiver_id);
CREATE INDEX idx_certificates_verification_status ON certificates(verification_status);
```

---

## 🔐 RLS 정책

```sql
-- 00009_add_rls_policies.sql

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles 정책
-- ============================================

-- 모든 프로필 조회 가능 (기본 정보만)
CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (true);

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- job_postings 정책
-- ============================================

-- 활성 구인글 조회 가능
CREATE POLICY "job_postings_select_active" ON job_postings
  FOR SELECT USING (status = 'active' OR guardian_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));

-- 보호자만 구인글 생성
CREATE POLICY "job_postings_insert_guardian" ON job_postings
  FOR INSERT WITH CHECK (
    guardian_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'guardian'
    )
  );

-- 본인 구인글만 수정/삭제
CREATE POLICY "job_postings_update_own" ON job_postings
  FOR UPDATE USING (
    guardian_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "job_postings_delete_own" ON job_postings
  FOR DELETE USING (
    guardian_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- applications 정책
-- ============================================

-- 본인 지원 또는 본인 구인글에 대한 지원만 조회
CREATE POLICY "applications_select_own" ON applications
  FOR SELECT USING (
    caregiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    job_id IN (
      SELECT id FROM job_postings WHERE guardian_id IN (
        SELECT id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- 간병인만 지원 가능
CREATE POLICY "applications_insert_caregiver" ON applications
  FOR INSERT WITH CHECK (
    caregiver_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid() AND role = 'caregiver'
    )
  );

-- ============================================
-- chat_rooms 정책
-- ============================================

-- 참여자만 채팅방 조회
CREATE POLICY "chat_rooms_select_participant" ON chat_rooms
  FOR SELECT USING (
    caregiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR
    guardian_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- ============================================
-- messages 정책
-- ============================================

-- 채팅방 참여자만 메시지 조회
CREATE POLICY "messages_select_participant" ON messages
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM chat_rooms WHERE 
        caregiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR
        guardian_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

-- 채팅방 참여자만 메시지 전송
CREATE POLICY "messages_insert_participant" ON messages
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT id FROM chat_rooms WHERE 
        caregiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        OR
        guardian_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    AND
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
```

---

## 🔧 유틸리티 함수

```sql
-- 업데이트 시간 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 지원 수 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_application_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE job_postings 
    SET application_count = application_count + 1 
    WHERE id = NEW.job_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE job_postings 
    SET application_count = application_count - 1 
    WHERE id = OLD.job_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거
CREATE TRIGGER update_application_count_trigger
  AFTER INSERT OR DELETE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_count();

-- 평균 평점 계산 함수
CREATE OR REPLACE FUNCTION get_average_rating(profile_id UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(AVG(rating), 0)::NUMERIC(3,2)
  FROM reviews
  WHERE reviewee_id = profile_id AND is_public = true;
$$ LANGUAGE sql STABLE;
```

---

## ✅ 체크리스트

### 테이블 생성 시
- [ ] 적절한 데이터 타입 선택
- [ ] NOT NULL 제약조건
- [ ] CHECK 제약조건
- [ ] 외래키 관계
- [ ] 인덱스 생성
- [ ] 업데이트 트리거

### RLS 정책 설정 시
- [ ] 읽기 권한 (SELECT)
- [ ] 쓰기 권한 (INSERT)
- [ ] 수정 권한 (UPDATE)
- [ ] 삭제 권한 (DELETE)
- [ ] 역할별 분리

---

## 🎮 명령어

| 명령어 | 설명 |
|--------|------|
| `/table [name]` | 새 테이블 생성 |
| `/rls [table]` | RLS 정책 추가 |
| `/index [table]` | 인덱스 최적화 |
| `/migrate` | 마이그레이션 생성 |

---

## 📁 관련 파일

- [CLAUDE.md](../../CLAUDE.md) - 프로젝트 메인 지침서
- [AGENT-ORCHESTRATOR.md](./AGENT-ORCHESTRATOR.md)
- [AGENT-FRONTEND.md](./AGENT-FRONTEND.md)
- [AGENT-BACKEND.md](./AGENT-BACKEND.md)

---

*Database Agent v1.0*
