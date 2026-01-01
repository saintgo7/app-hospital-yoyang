-- =============================================
-- CareMatch V3 Database Schema
-- Supabase PostgreSQL Migration
-- Version: 3.0.0
-- Date: 2026-01-02
-- =============================================

-- =============================================
-- 1. USERS (사용자 기본 정보)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(500),
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('caregiver', 'guardian', 'admin')),
    auth_provider VARCHAR(20) CHECK (auth_provider IN ('kakao', 'naver', 'email')),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =============================================
-- 2. CAREGIVERS (간병인 프로필)
-- =============================================
CREATE TABLE IF NOT EXISTS caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    birth_date DATE,
    address_sido VARCHAR(50),
    address_sigungu VARCHAR(50),
    address_detail VARCHAR(200),
    career_years INTEGER DEFAULT 0,
    introduction TEXT,
    
    -- 희망 조건
    preferred_work_type VARCHAR(50)[] DEFAULT '{}',  -- ['입주', '출퇴근', '시간제']
    preferred_regions VARCHAR(100)[] DEFAULT '{}',   -- ['서울 강남구', '서울 서초구']
    preferred_salary_type VARCHAR(20) CHECK (preferred_salary_type IN ('hourly', 'daily', 'monthly')),
    preferred_salary_min INTEGER,
    preferred_salary_max INTEGER,
    available_start_date DATE,
    
    -- 상태
    is_profile_complete BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMPTZ,
    
    -- 평가
    rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caregivers_user_id ON caregivers(user_id);
CREATE INDEX IF NOT EXISTS idx_caregivers_is_verified ON caregivers(is_verified);
CREATE INDEX IF NOT EXISTS idx_caregivers_address ON caregivers(address_sido, address_sigungu);
CREATE INDEX IF NOT EXISTS idx_caregivers_rating ON caregivers(rating DESC);

-- =============================================
-- 3. CAREGIVER_CERTIFICATES (간병인 자격증)
-- =============================================
CREATE TABLE IF NOT EXISTS caregiver_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID REFERENCES caregivers(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL,  -- '요양보호사', '간호조무사' 등
    certificate_number VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(200),
    file_url VARCHAR(500),
    
    -- 심사
    verification_status VARCHAR(20) DEFAULT 'pending' 
        CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_caregiver_id ON caregiver_certificates(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON caregiver_certificates(verification_status);

-- =============================================
-- 4. GUARDIANS (보호자/시설 프로필)
-- =============================================
CREATE TABLE IF NOT EXISTS guardians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    guardian_type VARCHAR(20) NOT NULL CHECK (guardian_type IN ('individual', 'facility')),
    
    -- 시설 정보 (guardian_type = 'facility'인 경우)
    facility_name VARCHAR(200),
    facility_type VARCHAR(50),
    business_number VARCHAR(20),
    
    -- 주소
    address_full VARCHAR(500),
    address_sido VARCHAR(50),
    address_sigungu VARCHAR(50),
    
    contact_phone VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardians_user_id ON guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_guardians_type ON guardians(guardian_type);

-- =============================================
-- 5. PATIENTS (환자 정보)
-- =============================================
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
    name VARCHAR(100),
    gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
    birth_year INTEGER,
    relationship VARCHAR(50),  -- 부모, 배우자, 기타
    
    -- 상태
    diagnosis TEXT[] DEFAULT '{}',      -- ['치매', '파킨슨', '뇌졸중']
    care_grade VARCHAR(20),             -- 장기요양등급
    mobility_level VARCHAR(50),         -- 거동가능, 거동보조필요, 와상
    feeding_level VARCHAR(50),          -- 자가식사, 식사보조, 경관영양
    toileting_level VARCHAR(50),        -- 자가배변, 배변보조, 기저귀
    cognitive_level VARCHAR(50),        -- 정상, 경도인지장애, 중증치매
    
    special_notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_guardian_id ON patients(guardian_id);

-- =============================================
-- 6. JOB_POSTINGS (구인공고)
-- =============================================
CREATE TABLE IF NOT EXISTS job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_id UUID REFERENCES guardians(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id),
    
    -- 기본 정보
    title VARCHAR(200) NOT NULL,
    work_type VARCHAR(50) NOT NULL,  -- '입주', '출퇴근', '시간제'
    
    -- 근무지
    work_location_sido VARCHAR(50) NOT NULL,
    work_location_sigungu VARCHAR(50) NOT NULL,
    work_location_detail VARCHAR(200),
    
    -- 근무 기간/시간
    work_start_date DATE NOT NULL,
    work_end_date DATE,
    work_duration_type VARCHAR(20),  -- '장기', '단기', '일시'
    work_time_start TIME,
    work_time_end TIME,
    
    -- 급여
    salary_type VARCHAR(20) NOT NULL CHECK (salary_type IN ('hourly', 'daily', 'monthly')),
    salary_amount INTEGER NOT NULL,
    salary_negotiable BOOLEAN DEFAULT FALSE,
    
    -- 우대 조건
    preferred_gender VARCHAR(10),
    preferred_age_min INTEGER,
    preferred_age_max INTEGER,
    required_certificates VARCHAR(100)[] DEFAULT '{}',
    
    -- 제공 사항
    meals_provided BOOLEAN DEFAULT FALSE,
    accommodation_provided BOOLEAN DEFAULT FALSE,
    
    description TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    
    -- 상태
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'closed', 'matched', 'deleted')),
    view_count INTEGER DEFAULT 0,
    application_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_postings_guardian_id ON job_postings(guardian_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_location ON job_postings(work_location_sido, work_location_sigungu);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_work_type ON job_postings(work_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_salary ON job_postings(salary_type, salary_amount);

-- =============================================
-- 7. APPLICATIONS (지원)
-- =============================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
    caregiver_id UUID REFERENCES caregivers(id) ON DELETE CASCADE,
    cover_letter TEXT,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'withdrawn')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    UNIQUE(job_posting_id, caregiver_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job_posting_id ON applications(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_applications_caregiver_id ON applications(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- =============================================
-- 8. MATCHES (매칭/계약)
-- =============================================
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID REFERENCES job_postings(id),
    caregiver_id UUID REFERENCES caregivers(id),
    guardian_id UUID REFERENCES guardians(id),
    application_id UUID REFERENCES applications(id),
    
    status VARCHAR(20) DEFAULT 'active' 
        CHECK (status IN ('active', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,
    agreed_salary INTEGER,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_caregiver_id ON matches(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_matches_guardian_id ON matches(guardian_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- =============================================
-- 9. CHAT_ROOMS (채팅방)
-- =============================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID REFERENCES job_postings(id),
    caregiver_id UUID REFERENCES caregivers(id),
    guardian_id UUID REFERENCES guardians(id),
    
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    caregiver_unread_count INTEGER DEFAULT 0,
    guardian_unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_posting_id, caregiver_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_caregiver_id ON chat_rooms(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_guardian_id ON chat_rooms(guardian_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_message_at ON chat_rooms(last_message_at DESC);

-- =============================================
-- 10. MESSAGES (메시지)
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' 
        CHECK (message_type IN ('text', 'image', 'file', 'system')),
    file_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- =============================================
-- 11. REVIEWS (리뷰)
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id),
    reviewer_id UUID REFERENCES users(id),
    reviewee_id UUID REFERENCES users(id),
    reviewer_type VARCHAR(20) CHECK (reviewer_type IN ('caregiver', 'guardian')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_match_id ON reviews(match_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- =============================================
-- 12. BOOKMARKS (북마크/관심)
-- =============================================
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_posting_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- =============================================
-- 13. NOTIFICATIONS (알림)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'application', 'message', 'review', 'system'
    title VARCHAR(200) NOT NULL,
    content TEXT,
    link VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 지원자 수 증가 함수
CREATE OR REPLACE FUNCTION increment_application_count(posting_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE job_postings
    SET application_count = application_count + 1
    WHERE id = posting_id;
END;
$$ LANGUAGE plpgsql;

-- 간병인 평점 업데이트 함수
CREATE OR REPLACE FUNCTION update_caregiver_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_caregiver_id UUID;
BEGIN
    -- 매칭에서 간병인 ID 가져오기
    SELECT caregiver_id INTO v_caregiver_id
    FROM matches
    WHERE id = NEW.match_id;
    
    -- 평점 및 리뷰 수 업데이트
    UPDATE caregivers
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews r
            JOIN matches m ON r.match_id = m.id
            WHERE m.caregiver_id = v_caregiver_id
            AND r.reviewer_type = 'guardian'
        ),
        review_count = (
            SELECT COUNT(*)
            FROM reviews r
            JOIN matches m ON r.match_id = m.id
            WHERE m.caregiver_id = v_caregiver_id
            AND r.reviewer_type = 'guardian'
        )
    WHERE id = v_caregiver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated_at 트리거
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_caregivers_updated_at ON caregivers;
CREATE TRIGGER update_caregivers_updated_at 
    BEFORE UPDATE ON caregivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_guardians_updated_at ON guardians;
CREATE TRIGGER update_guardians_updated_at 
    BEFORE UPDATE ON guardians
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at 
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON job_postings;
CREATE TRIGGER update_job_postings_updated_at 
    BEFORE UPDATE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matches_updated_at ON matches;
CREATE TRIGGER update_matches_updated_at 
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 리뷰 작성 시 평점 업데이트 트리거
DROP TRIGGER IF EXISTS trigger_update_caregiver_rating ON reviews;
CREATE TRIGGER trigger_update_caregiver_rating 
    AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_caregiver_rating();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Users 정책
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Caregivers 정책
CREATE POLICY "Anyone can view caregivers" ON caregivers
    FOR SELECT USING (true);

CREATE POLICY "Caregivers can update own profile" ON caregivers
    FOR UPDATE USING (user_id = auth.uid());

-- Job Postings 정책
CREATE POLICY "Anyone can view active job postings" ON job_postings
    FOR SELECT USING (status = 'active' OR guardian_id IN (
        SELECT id FROM guardians WHERE user_id = auth.uid()
    ));

CREATE POLICY "Guardians can manage own postings" ON job_postings
    FOR ALL USING (
        guardian_id IN (
            SELECT id FROM guardians WHERE user_id = auth.uid()
        )
    );

-- Applications 정책
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (
        caregiver_id IN (SELECT id FROM caregivers WHERE user_id = auth.uid())
        OR job_posting_id IN (
            SELECT id FROM job_postings WHERE guardian_id IN (
                SELECT id FROM guardians WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Caregivers can create applications" ON applications
    FOR INSERT WITH CHECK (
        caregiver_id IN (SELECT id FROM caregivers WHERE user_id = auth.uid())
    );

-- Chat Rooms 정책
CREATE POLICY "Chat participants can view rooms" ON chat_rooms
    FOR SELECT USING (
        caregiver_id IN (SELECT id FROM caregivers WHERE user_id = auth.uid())
        OR guardian_id IN (SELECT id FROM guardians WHERE user_id = auth.uid())
    );

-- Messages 정책
CREATE POLICY "Chat participants can view messages" ON messages
    FOR SELECT USING (
        chat_room_id IN (
            SELECT id FROM chat_rooms 
            WHERE caregiver_id IN (SELECT id FROM caregivers WHERE user_id = auth.uid())
            OR guardian_id IN (SELECT id FROM guardians WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Chat participants can send messages" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND chat_room_id IN (
            SELECT id FROM chat_rooms 
            WHERE caregiver_id IN (SELECT id FROM caregivers WHERE user_id = auth.uid())
            OR guardian_id IN (SELECT id FROM guardians WHERE user_id = auth.uid())
        )
    );

-- Notifications 정책
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Bookmarks 정책
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
    FOR ALL USING (user_id = auth.uid());

-- =============================================
-- REALTIME SUBSCRIPTIONS
-- =============================================

-- Enable realtime for specific tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- =============================================
-- STORAGE BUCKETS (Supabase Storage)
-- =============================================

-- Note: Run these in Supabase Dashboard > Storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false);
