# 케어매치(CareMatch) V3 API 명세서

---

## 문서 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | 케어매치(CareMatch) V3 |
| 문서버전 | 1.0 |
| 작성일자 | 2026년 1월 2일 |
| API 버전 | v1 |

---

## 목차

1. [API 개요](#1-api-개요)
2. [인증](#2-인증)
3. [사용자 API](#3-사용자-api)
4. [구인글 API](#4-구인글-api)
5. [지원 API](#5-지원-api)
6. [채팅 API](#6-채팅-api)
7. [리뷰 API](#7-리뷰-api)
8. [에러 코드](#8-에러-코드)

---

## 1. API 개요

### 1.1 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `https://your-domain.com/api` |
| 프로토콜 | HTTPS |
| 인증 방식 | NextAuth.js Session |
| 응답 형식 | JSON |

### 1.2 공통 응답 형식

**성공 응답**:
```json
{
  "data": { ... },
  "message": "성공 메시지"
}
```

**에러 응답**:
```json
{
  "error": "에러 메시지"
}
```

### 1.3 HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성됨 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

---

## 2. 인증

### 2.1 소셜 로그인

NextAuth.js를 통한 OAuth 인증을 사용합니다.

**지원 Provider**:
- Kakao
- Naver

**인증 엔드포인트**: `/api/auth/[...nextauth]`

### 2.2 세션 확인

모든 인증 필요 API는 NextAuth.js 세션을 확인합니다.

```typescript
// 서버 측 세션 확인
const session = await getServerSession(req, res, authOptions)
if (!session) {
  return res.status(401).json({ error: '로그인이 필요합니다' })
}
```

---

## 3. 사용자 API

### 3.1 프로필 완성

사용자 프로필을 완성합니다.

**엔드포인트**: `POST /api/users/complete-profile`

**인증**: 필수

**Request Body**:
```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "role": "caregiver"
}
```

**Response (200)**:
```json
{
  "message": "프로필이 완성되었습니다",
  "redirectUrl": "/caregiver/dashboard"
}
```

**에러 응답**:
| 코드 | 메시지 |
|------|--------|
| 400 | 필수 정보를 입력해주세요 |
| 401 | 로그인이 필요합니다 |

---

### 3.2 간병인 프로필 조회

**엔드포인트**: `GET /api/caregiver/profile`

**인증**: 필수

**Response (200)**:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "experience_years": 5,
  "certifications": ["요양보호사", "간호조무사"],
  "introduction": "안녕하세요...",
  "preferred_location": "서울",
  "preferred_salary": 3000000,
  "available": true,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-02T00:00:00Z"
}
```

---

### 3.3 간병인 프로필 수정

**엔드포인트**: `PUT /api/caregiver/profile`

**인증**: 필수

**Request Body**:
```json
{
  "experience_years": 5,
  "certifications": ["요양보호사", "간호조무사"],
  "introduction": "안녕하세요, 5년차 간병인입니다.",
  "preferred_location": "서울 강남구",
  "preferred_salary": 3500000,
  "available": true
}
```

**Response (200)**:
```json
{
  "message": "프로필이 수정되었습니다",
  "profile": { ... }
}
```

---

## 4. 구인글 API

### 4.1 구인글 목록 조회

**엔드포인트**: `GET /api/jobs`

**인증**: 선택

**Query Parameters**:
| 파라미터 | 타입 | 설명 | 기본값 |
|---------|------|------|--------|
| page | number | 페이지 번호 | 1 |
| limit | number | 페이지당 개수 | 10 |
| location | string | 지역 필터 | - |
| work_type | string | 근무형태 필터 | - |
| status | string | 상태 필터 | open |

**Response (200)**:
```json
{
  "jobs": [
    {
      "id": "uuid",
      "guardian_id": "uuid",
      "title": "서울 강남 요양병원 간병인 구합니다",
      "description": "어머니 간병 도와주실 분...",
      "location": "서울 강남구",
      "salary": 3000000,
      "work_type": "live_in",
      "patient_condition": "거동 불편, 식사 도움 필요",
      "status": "open",
      "created_at": "2026-01-01T00:00:00Z",
      "guardian": {
        "name": "김보호"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "totalPages": 10
}
```

---

### 4.2 구인글 상세 조회

**엔드포인트**: `GET /api/jobs/[id]`

**인증**: 선택

**Path Parameters**:
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| id | uuid | 구인글 ID |

**Response (200)**:
```json
{
  "id": "uuid",
  "guardian_id": "uuid",
  "title": "서울 강남 요양병원 간병인 구합니다",
  "description": "어머니 간병 도와주실 분을 찾습니다...",
  "location": "서울 강남구",
  "salary": 3000000,
  "work_type": "live_in",
  "patient_condition": "거동 불편, 식사 도움 필요",
  "status": "open",
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-02T00:00:00Z",
  "guardian": {
    "id": "uuid",
    "name": "김보호",
    "image": "https://..."
  },
  "applications_count": 5
}
```

---

### 4.3 구인글 등록

**엔드포인트**: `POST /api/jobs`

**인증**: 필수 (보호자만)

**Request Body**:
```json
{
  "title": "서울 강남 요양병원 간병인 구합니다",
  "description": "어머니 간병 도와주실 분을 찾습니다.",
  "location": "서울 강남구",
  "salary": 3000000,
  "work_type": "live_in",
  "patient_condition": "거동 불편, 식사 도움 필요"
}
```

**Response (201)**:
```json
{
  "message": "구인글이 등록되었습니다",
  "job": { ... }
}
```

---

### 4.4 구인글 수정

**엔드포인트**: `PUT /api/guardian/jobs/[id]`

**인증**: 필수 (작성자만)

**Request Body**: 구인글 등록과 동일

**Response (200)**:
```json
{
  "message": "구인글이 수정되었습니다",
  "job": { ... }
}
```

---

### 4.5 구인글 마감

**엔드포인트**: `PUT /api/guardian/jobs/[id]`

**인증**: 필수 (작성자만)

**Request Body**:
```json
{
  "status": "closed"
}
```

---

## 5. 지원 API

### 5.1 지원 목록 조회

**엔드포인트**: `GET /api/applications`

**인증**: 필수

**Response (200)** (간병인):
```json
{
  "applications": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "status": "pending",
      "message": "지원합니다",
      "created_at": "2026-01-01T00:00:00Z",
      "job": {
        "title": "서울 강남...",
        "location": "서울 강남구",
        "salary": 3000000
      }
    }
  ]
}
```

**Response (200)** (보호자 - 특정 구인글):
```json
{
  "applications": [
    {
      "id": "uuid",
      "caregiver_id": "uuid",
      "status": "pending",
      "message": "지원합니다",
      "created_at": "2026-01-01T00:00:00Z",
      "caregiver": {
        "name": "이간병",
        "image": "https://...",
        "profile": {
          "experience_years": 5,
          "certifications": ["요양보호사"]
        }
      }
    }
  ]
}
```

---

### 5.2 지원하기

**엔드포인트**: `POST /api/applications`

**인증**: 필수 (간병인만)

**Request Body**:
```json
{
  "job_id": "uuid",
  "message": "안녕하세요, 5년 경력의 간병인입니다..."
}
```

**Response (201)**:
```json
{
  "message": "지원이 완료되었습니다",
  "application": { ... }
}
```

---

### 5.3 지원 상태 변경

**엔드포인트**: `PUT /api/applications/[id]`

**인증**: 필수 (구인글 작성자만)

**Request Body**:
```json
{
  "status": "accepted"
}
```

| status | 설명 |
|--------|------|
| accepted | 수락 |
| rejected | 거절 |

**Response (200)**:
```json
{
  "message": "지원 상태가 변경되었습니다",
  "application": { ... }
}
```

---

## 6. 채팅 API

### 6.1 채팅방 목록 조회

**엔드포인트**: `GET /api/chat/rooms`

**인증**: 필수

**Response (200)**:
```json
{
  "rooms": [
    {
      "id": "uuid",
      "guardian_id": "uuid",
      "caregiver_id": "uuid",
      "job_id": "uuid",
      "created_at": "2026-01-01T00:00:00Z",
      "other_user": {
        "id": "uuid",
        "name": "홍길동",
        "image": "https://..."
      },
      "last_message": {
        "content": "안녕하세요",
        "created_at": "2026-01-02T00:00:00Z"
      },
      "unread_count": 2
    }
  ]
}
```

---

### 6.2 채팅방 생성

**엔드포인트**: `POST /api/chat/rooms`

**인증**: 필수

**Request Body**:
```json
{
  "other_user_id": "uuid",
  "job_id": "uuid"
}
```

**Response (201)**:
```json
{
  "room": {
    "id": "uuid",
    "guardian_id": "uuid",
    "caregiver_id": "uuid",
    "job_id": "uuid"
  }
}
```

---

### 6.3 메시지 목록 조회

**엔드포인트**: `GET /api/chat/rooms/[roomId]/messages`

**인증**: 필수 (채팅방 참여자만)

**Query Parameters**:
| 파라미터 | 타입 | 설명 | 기본값 |
|---------|------|------|--------|
| limit | number | 조회 개수 | 50 |
| before | string | 이전 메시지 커서 | - |

**Response (200)**:
```json
{
  "messages": [
    {
      "id": "uuid",
      "room_id": "uuid",
      "sender_id": "uuid",
      "content": "안녕하세요",
      "read": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "hasMore": true
}
```

---

### 6.4 메시지 전송

**엔드포인트**: `POST /api/chat/rooms/[roomId]/messages`

**인증**: 필수 (채팅방 참여자만)

**Request Body**:
```json
{
  "content": "안녕하세요, 문의드립니다."
}
```

**Response (201)**:
```json
{
  "message": {
    "id": "uuid",
    "room_id": "uuid",
    "sender_id": "uuid",
    "content": "안녕하세요, 문의드립니다.",
    "read": false,
    "created_at": "2026-01-02T00:00:00Z"
  }
}
```

---

## 7. 리뷰 API

### 7.1 리뷰 목록 조회

**엔드포인트**: `GET /api/reviews`

**인증**: 선택

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| user_id | uuid | 특정 사용자의 리뷰 |
| job_id | uuid | 특정 구인글의 리뷰 |

**Response (200)**:
```json
{
  "reviews": [
    {
      "id": "uuid",
      "job_id": "uuid",
      "reviewer_id": "uuid",
      "reviewee_id": "uuid",
      "rating": 5,
      "comment": "정말 잘해주셨습니다",
      "created_at": "2026-01-01T00:00:00Z",
      "reviewer": {
        "name": "김보호"
      },
      "job": {
        "title": "서울 강남..."
      }
    }
  ],
  "averageRating": 4.5
}
```

---

### 7.2 리뷰 작성

**엔드포인트**: `POST /api/reviews`

**인증**: 필수

**Request Body**:
```json
{
  "job_id": "uuid",
  "reviewee_id": "uuid",
  "rating": 5,
  "comment": "어머니를 정성껏 돌봐주셔서 감사합니다."
}
```

**Response (201)**:
```json
{
  "message": "리뷰가 등록되었습니다",
  "review": { ... }
}
```

---

## 8. 에러 코드

### 8.1 공통 에러

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 401 | 로그인이 필요합니다 | 인증되지 않은 요청 |
| 403 | 권한이 없습니다 | 접근 권한 없음 |
| 404 | 리소스를 찾을 수 없습니다 | 요청한 데이터 없음 |
| 500 | 서버 오류가 발생했습니다 | 내부 서버 오류 |

### 8.2 비즈니스 에러

| 코드 | 메시지 | 설명 |
|------|--------|------|
| 400 | 이미 지원한 구인글입니다 | 중복 지원 |
| 400 | 마감된 구인글입니다 | 마감된 글에 지원 시도 |
| 400 | 이미 리뷰를 작성하셨습니다 | 중복 리뷰 |
| 400 | 필수 정보를 입력해주세요 | 필수 필드 누락 |

---

*본 문서는 케어매치 V3의 API 명세를 담고 있습니다.*
