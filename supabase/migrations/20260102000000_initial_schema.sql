-- CareMatch V3 초기 스키마
-- 생성일: 2026-01-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- ENUM 타입
-- ===================================

CREATE TYPE user_role AS ENUM ('caregiver', 'guardian');
CREATE TYPE job_status AS ENUM ('open', 'closed', 'in_progress', 'completed');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');

-- ===================================
-- 사용자 테이블
-- ===================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ===================================
-- 간병인 프로필 테이블
-- ===================================

CREATE TABLE caregiver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  experience_years INTEGER DEFAULT 0,
  certifications TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  introduction TEXT,
  hourly_rate INTEGER,
  is_available BOOLEAN DEFAULT true,
  location VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_caregiver_profiles_user_id ON caregiver_profiles(user_id);
CREATE INDEX idx_caregiver_profiles_is_available ON caregiver_profiles(is_available);
CREATE INDEX idx_caregiver_profiles_location ON caregiver_profiles(location);

-- ===================================
-- 구인글 테이블
-- ===================================

CREATE TABLE job_postings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(100) NOT NULL,
  patient_info JSONB NOT NULL DEFAULT '{}',
  care_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  hourly_rate INTEGER NOT NULL,
  status job_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_job_postings_guardian_id ON job_postings(guardian_id);
CREATE INDEX idx_job_postings_status ON job_postings(status);
CREATE INDEX idx_job_postings_location ON job_postings(location);
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);

-- ===================================
-- 지원 테이블
-- ===================================

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status application_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 지원 방지
  UNIQUE(job_id, caregiver_id)
);

-- 인덱스
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_caregiver_id ON applications(caregiver_id);
CREATE INDEX idx_applications_status ON applications(status);

-- ===================================
-- 채팅방 테이블
-- ===================================

CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 채팅방 방지
  UNIQUE(caregiver_id, guardian_id)
);

-- 인덱스
CREATE INDEX idx_chat_rooms_caregiver_id ON chat_rooms(caregiver_id);
CREATE INDEX idx_chat_rooms_guardian_id ON chat_rooms(guardian_id);

-- ===================================
-- 메시지 테이블
-- ===================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_unread ON messages(room_id, is_read) WHERE is_read = false;

-- ===================================
-- 리뷰 테이블
-- ===================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 리뷰 방지
  UNIQUE(job_id, reviewer_id)
);

-- 인덱스
CREATE INDEX idx_reviews_job_id ON reviews(job_id);
CREATE INDEX idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ===================================
-- RLS (Row Level Security) 정책
-- ===================================

-- 모든 테이블에 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 사용자 정책: 본인 정보만 수정 가능
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 간병인 프로필 정책
CREATE POLICY "Anyone can view caregiver profiles" ON caregiver_profiles
  FOR SELECT USING (true);

CREATE POLICY "Caregivers can update own profile" ON caregiver_profiles
  FOR ALL USING (auth.uid() = user_id);

-- 구인글 정책
CREATE POLICY "Anyone can view open job postings" ON job_postings
  FOR SELECT USING (status = 'open' OR guardian_id = auth.uid());

CREATE POLICY "Guardians can manage own job postings" ON job_postings
  FOR ALL USING (guardian_id = auth.uid());

-- 지원 정책
CREATE POLICY "Caregivers can view own applications" ON applications
  FOR SELECT USING (caregiver_id = auth.uid());

CREATE POLICY "Guardians can view applications for their jobs" ON applications
  FOR SELECT USING (
    job_id IN (SELECT id FROM job_postings WHERE guardian_id = auth.uid())
  );

CREATE POLICY "Caregivers can create applications" ON applications
  FOR INSERT WITH CHECK (caregiver_id = auth.uid());

CREATE POLICY "Guardians can update application status" ON applications
  FOR UPDATE USING (
    job_id IN (SELECT id FROM job_postings WHERE guardian_id = auth.uid())
  );

-- 채팅방 정책
CREATE POLICY "Users can view own chat rooms" ON chat_rooms
  FOR SELECT USING (caregiver_id = auth.uid() OR guardian_id = auth.uid());

CREATE POLICY "Users can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (caregiver_id = auth.uid() OR guardian_id = auth.uid());

-- 메시지 정책
CREATE POLICY "Users can view messages in their chat rooms" ON messages
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM chat_rooms
      WHERE caregiver_id = auth.uid() OR guardian_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their chat rooms" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (
      SELECT id FROM chat_rooms
      WHERE caregiver_id = auth.uid() OR guardian_id = auth.uid()
    )
  );

-- 리뷰 정책
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for completed jobs" ON reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- ===================================
-- 트리거 함수: updated_at 자동 갱신
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 적용
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_caregiver_profiles_updated_at
  BEFORE UPDATE ON caregiver_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON job_postings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Realtime 활성화
-- ===================================

-- 메시지 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
