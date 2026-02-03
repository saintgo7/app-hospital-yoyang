-- ===================================
-- CareMatch V3 초기 데이터 (선택)
-- ===================================
-- 생성일: 2026-02-04
-- 용도: 테스트 및 데모용 데이터
-- ===================================

-- ===================================
-- 테스트 사용자
-- ===================================

-- 보호자 1
INSERT INTO users (id, email, name, phone, role, avatar_url)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'guardian1@test.com',
  '김보호',
  '010-1234-5678',
  'guardian',
  NULL
);

-- 보호자 2
INSERT INTO users (id, email, name, phone, role, avatar_url)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'guardian2@test.com',
  '이가족',
  '010-2345-6789',
  'guardian',
  NULL
);

-- 간병인 1
INSERT INTO users (id, email, name, phone, role, avatar_url)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'caregiver1@test.com',
  '박간병',
  '010-3456-7890',
  'caregiver',
  NULL
);

-- 간병인 2
INSERT INTO users (id, email, name, phone, role, avatar_url)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  'caregiver2@test.com',
  '최돌봄',
  '010-4567-8901',
  'caregiver',
  NULL
);

-- ===================================
-- 간병인 프로필
-- ===================================

INSERT INTO caregiver_profiles (user_id, experience_years, certifications, specializations, introduction, hourly_rate, is_available, location)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  5,
  ARRAY['요양보호사 1급', 'CPR 자격증'],
  ARRAY['치매 케어', '와상환자 케어'],
  '5년 경력의 요양보호사입니다. 치매 환자 케어 전문입니다.',
  15000,
  true,
  '서울 강남구'
);

INSERT INTO caregiver_profiles (user_id, experience_years, certifications, specializations, introduction, hourly_rate, is_available, location)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  3,
  ARRAY['요양보호사 2급'],
  ARRAY['노인 케어'],
  '친절하고 성실한 간병인입니다.',
  12000,
  true,
  '서울 송파구'
);

-- ===================================
-- 구인글
-- ===================================

INSERT INTO job_postings (id, guardian_id, title, description, location, patient_info, care_type, start_date, end_date, hourly_rate, status)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '요양병원 간병인 구합니다 (주간)',
  '어머니 병원 간병을 도와주실 분을 찾습니다. 주간 근무입니다.',
  '서울 강남구',
  '{"age": 75, "gender": "여성", "condition": "낙상 후 입원"}',
  '병원 간병',
  '2026-02-10',
  '2026-03-10',
  15000,
  'open'
);

INSERT INTO job_postings (id, guardian_id, title, description, location, patient_info, care_type, start_date, end_date, hourly_rate, status)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '22222222-2222-2222-2222-222222222222',
  '요양원 방문 간병 (주 3회)',
  '아버지 요양원 방문 간병을 부탁드립니다.',
  '서울 송파구',
  '{"age": 80, "gender": "남성", "condition": "치매 초기"}',
  '요양원 방문',
  '2026-02-15',
  NULL,
  13000,
  'open'
);

-- ===================================
-- 지원 (테스트)
-- ===================================

INSERT INTO applications (job_id, caregiver_id, message, status)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  '경력 5년의 요양보호사입니다. 성심껏 돌봐드리겠습니다.',
  'pending'
);

-- ===================================
-- 완료
-- ===================================
