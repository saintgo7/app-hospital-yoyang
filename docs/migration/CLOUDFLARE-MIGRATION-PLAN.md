# 🚀 CareMatch V3 마이그레이션 계획서

> **Vercel + Supabase → Cloudflare Pages + Custom Server + SQLite**
> **기간**: 11일 (2026-01-19 ~ 2026-01-29)
> **목표**: 월 $55 운영비 → $0 (100% 무료 전환)

---

## 📊 AS-IS vs TO-BE 비교

| 구성요소 | AS-IS (현재) | TO-BE (목표) | 변경 이유 |
|---------|-------------|-------------|----------|
| **Frontend** | Vercel (Next.js SSR) | Cloudflare Pages (Vite + React) | 무료 정적 호스팅 |
| **Backend** | Vercel Serverless Functions | FastAPI/Go on 61.245.248.247 | 자체 서버 활용 |
| **Database** | Supabase PostgreSQL | SQLite 3.45+ | 비용 절감, 단순화 |
| **Auth** | NextAuth.js + Supabase | JWT + Custom Auth | 자체 구현 |
| **Realtime** | Supabase Realtime | WebSocket (Socket.IO) | 자체 서버에서 지원 |
| **Storage** | Supabase Storage | Local Filesystem + Nginx | 자체 서버 활용 |
| **월 비용** | $55 (Vercel $20 + Supabase $25) | $0 (Cloudflare Free + 보유 서버) | 100% 비용 절감 |

---

## 🏗️ TO-BE 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages (무료)                    │
│                  https://carematch.pages.dev                 │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Vite + React 18 + TypeScript (정적 빌드)            │   │
│  │   - 간병인 대시보드                                   │   │
│  │   - 보호자 대시보드                                   │   │
│  │   - 채팅 UI                                          │   │
│  │   - shadcn/ui + TailwindCSS                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS API 호출
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              61.245.248.247 (자체 서버)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Nginx (Reverse Proxy + SSL)                          │   │
│  │   - CORS 설정                                        │   │
│  │   - Rate Limiting                                    │   │
│  │   - Static File Serving (/uploads)                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ FastAPI 0.110+ / Go 1.22+ (Backend API)              │   │
│  │   - RESTful API                                      │   │
│  │   - JWT Authentication                               │   │
│  │   - WebSocket (채팅)                                 │   │
│  │   - Kakao/Naver OAuth                                │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│                              ▼                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ SQLite 3.45+ (WAL Mode)                              │   │
│  │   - /var/lib/carematch/carematch.db                  │   │
│  │   - Auto Backup (매일 3시)                           │   │
│  │   - FTS5 (전문검색)                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 5단계 마이그레이션 계획 (11일)

### Phase 1: 분석 및 준비 (Day 1-2)

**목표**: 현재 아키텍처 분석 및 데이터 백업

| 작업 | 담당 | 시간 | 상세 |
|------|------|------|------|
| Supabase 데이터 덤프 | Database | 2h | PostgreSQL → JSON/CSV 백업 |
| API 엔드포인트 목록화 | Backend | 3h | pages/api/* 전수 조사 |
| 프론트엔드 의존성 분석 | Frontend | 2h | Next.js → React 전환 항목 파악 |
| 서버 환경 구성 | DevOps | 2h | 61.245.248.247 스펙 확인 |

**체크리스트**:
- [ ] Supabase 전체 데이터 백업 완료 (`backup_20260119.json`)
- [ ] API 엔드포인트 28개 문서화
- [ ] Next.js 전용 기능 리스트 (getServerSideProps, Image 등)
- [ ] 서버 사양 확인 (CPU, RAM, Disk, OS)

---

### Phase 2: 백엔드 서버 구축 (Day 3-5)

**목표**: 61.245.248.247에 FastAPI + SQLite 구축

#### 2.1 SQLite 데이터베이스 설계 (Day 3)

**스키마 예시**:

```sql
-- users 테이블
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('caregiver', 'guardian')) NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- job_postings 테이블 (구인글)
CREATE TABLE job_postings (
  id TEXT PRIMARY KEY,
  guardian_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  work_schedule TEXT,
  status TEXT DEFAULT 'open',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (guardian_id) REFERENCES users(id) ON DELETE CASCADE
);

-- applications 테이블 (지원)
CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  caregiver_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES job_postings(id) ON DELETE CASCADE,
  FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- messages 테이블 (채팅)
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- FTS5 전문검색 (구인글 제목/내용)
CREATE VIRTUAL TABLE job_postings_fts USING fts5(
  title, description, content=job_postings, content_rowid=id
);

-- 인덱스
CREATE INDEX idx_job_postings_guardian ON job_postings(guardian_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_caregiver ON applications(caregiver_id);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
```

**SQLite 최적화 설정**:

```sql
-- WAL 모드 활성화 (동시성 향상)
PRAGMA journal_mode=WAL;

-- 동기화 모드 (성능과 안정성 균형)
PRAGMA synchronous=NORMAL;

-- 캐시 크기 (64MB)
PRAGMA cache_size=-64000;

-- 자동 인덱스 비활성화 (명시적 인덱스 사용)
PRAGMA automatic_index=OFF;

-- 외래키 제약조건 활성화
PRAGMA foreign_keys=ON;
```

#### 2.2 FastAPI 백엔드 구현 (Day 4-5)

**프로젝트 구조**:

```
backend/
├── main.py                 # FastAPI 엔트리포인트
├── requirements.txt        # 의존성
├── config.py              # 설정 (환경변수)
├── database.py            # SQLite 연결
├── models/                # Pydantic 모델
│   ├── user.py
│   ├── job.py
│   └── message.py
├── routers/               # API 라우터
│   ├── auth.py           # 인증 (JWT)
│   ├── jobs.py           # 구인글 CRUD
│   ├── applications.py   # 지원 관리
│   └── chat.py           # WebSocket 채팅
├── services/             # 비즈니스 로직
│   ├── auth_service.py
│   └── kakao_service.py
└── utils/
    ├── jwt.py            # JWT 유틸리티
    └── password.py       # 비밀번호 해싱
```

**main.py 예시**:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, jobs, applications, chat
import uvicorn

app = FastAPI(title="CareMatch API", version="3.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://carematch.pages.dev"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

@app.get("/")
async def root():
    return {"message": "CareMatch API v3.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

**routers/auth.py (JWT 인증) 예시**:

```python
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
import sqlite3
from datetime import datetime, timedelta

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = sqlite3.connect("/var/lib/carematch/carematch.db")
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, password FROM users WHERE email = ?", (form_data.username,))
    user = cursor.fetchone()
    conn.close()

    if not user or not pwd_context.verify(form_data.password, user[2]):
        raise HTTPException(status_code=401, detail="잘못된 이메일 또는 비밀번호")

    access_token = create_access_token({"sub": user[0], "email": user[1]})
    return {"access_token": access_token, "token_type": "bearer"}
```

**routers/chat.py (WebSocket) 예시**:

```python
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import sqlite3

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        self.active_connections.pop(user_id, None)

    async def send_message(self, receiver_id: str, message: dict):
        if receiver_id in self.active_connections:
            await self.active_connections[receiver_id].send_json(message)

manager = ConnectionManager()

@router.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # DB에 메시지 저장
            conn = sqlite3.connect("/var/lib/carematch/carematch.db")
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO messages (id, sender_id, receiver_id, content, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            """, (message['id'], user_id, message['receiver_id'], message['content']))
            conn.commit()
            conn.close()

            # 수신자에게 전송
            await manager.send_message(message['receiver_id'], {
                "id": message['id'],
                "sender_id": user_id,
                "content": message['content'],
                "created_at": datetime.utcnow().isoformat()
            })
    except WebSocketDisconnect:
        manager.disconnect(user_id)
```

**requirements.txt**:

```
fastapi==0.110.0
uvicorn[standard]==0.27.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
websockets==12.0
```

#### 2.3 Nginx 설정 (Day 5)

**/etc/nginx/sites-available/carematch**:

```nginx
upstream backend {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.carematch.com;

    # SSL 설정 (Let's Encrypt)
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/api.carematch.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.carematch.com/privkey.pem;

    # CORS Headers
    add_header 'Access-Control-Allow-Origin' 'https://carematch.pages.dev' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

    # API 프록시
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket 프록시
    location /api/chat/ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # 파일 업로드 제공
    location /uploads/ {
        alias /var/lib/carematch/uploads/;
        expires 30d;
    }
}
```

---

### Phase 3: 프론트엔드 재구축 (Day 6-8)

**목표**: Next.js → Vite + React 전환

#### 3.1 Vite 프로젝트 생성 (Day 6)

```bash
cd /Users/saint/01_DEV/carematch-v3-frontend
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom @tanstack/react-query axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**프로젝트 구조**:

```
carematch-v3-frontend/
├── src/
│   ├── main.tsx              # 엔트리포인트
│   ├── App.tsx               # 라우터 설정
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── CaregiverDashboard.tsx
│   │   ├── GuardianDashboard.tsx
│   │   └── Chat.tsx
│   ├── components/           # shadcn/ui 컴포넌트
│   │   ├── ui/
│   │   ├── layout/
│   │   └── chat/
│   ├── lib/
│   │   ├── api.ts           # Axios 인스턴스
│   │   └── auth.ts          # JWT 관리
│   └── hooks/
│       ├── useAuth.ts
│       └── useWebSocket.ts
└── vite.config.ts
```

**src/lib/api.ts (API 클라이언트)**:

```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://api.carematch.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 (JWT 자동 추가)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터 (401 처리)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

**src/hooks/useWebSocket.ts (채팅용)**:

```typescript
import { useEffect, useRef, useState } from 'react'

export function useWebSocket(userId: string) {
  const [messages, setMessages] = useState<any[]>([])
  const ws = useRef<WebSocket | null>(null)

  useEffect(() => {
    ws.current = new WebSocket(`wss://api.carematch.com/api/chat/ws/${userId}`)

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data)
      setMessages((prev) => [...prev, message])
    }

    return () => {
      ws.current?.close()
    }
  }, [userId])

  const sendMessage = (receiver_id: string, content: string) => {
    const message = {
      id: crypto.randomUUID(),
      receiver_id,
      content,
    }
    ws.current?.send(JSON.stringify(message))
    setMessages((prev) => [...prev, { ...message, sender_id: userId }])
  }

  return { messages, sendMessage }
}
```

#### 3.2 라우팅 설정 (Day 7)

**src/App.tsx**:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Home from './pages/Home'
import Login from './pages/Login'
import CaregiverDashboard from './pages/CaregiverDashboard'
import GuardianDashboard from './pages/GuardianDashboard'
import Chat from './pages/Chat'
import { useAuth } from './hooks/useAuth'

const queryClient = new QueryClient()

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/caregiver/*"
            element={
              <PrivateRoute>
                <CaregiverDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/guardian/*"
            element={
              <PrivateRoute>
                <GuardianDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
```

#### 3.3 컴포넌트 마이그레이션 (Day 8)

- [ ] 기존 Next.js 컴포넌트를 Vite 프로젝트로 복사
- [ ] `next/image` → `<img>` 전환
- [ ] `next/link` → `react-router-dom Link` 전환
- [ ] `getServerSideProps` 로직 → `useQuery`로 전환
- [ ] shadcn/ui 컴포넌트 재설치

---

### Phase 4: Cloudflare Pages 배포 (Day 9)

**목표**: Vite 빌드 후 Cloudflare Pages 배포

#### 4.1 빌드 최적화

**vite.config.ts**:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
```

#### 4.2 Cloudflare Pages 설정

**wrangler.toml**:

```toml
name = "carematch-v3"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"
```

**배포 명령어**:

```bash
# 로컬 빌드
npm run build

# Cloudflare Pages에 배포
npx wrangler pages deploy dist --project-name carematch-v3
```

**Cloudflare 대시보드 설정**:
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables:
  - `VITE_API_URL=https://api.carematch.com`

---

### Phase 5: 통합 테스트 및 데이터 마이그레이션 (Day 10-11)

**목표**: PostgreSQL → SQLite 데이터 이관 및 전체 시스템 테스트

#### 5.1 데이터 마이그레이션 스크립트 (Day 10)

**migrate_data.py**:

```python
import psycopg2
import sqlite3
import json
from datetime import datetime

# PostgreSQL 연결
pg_conn = psycopg2.connect(
    host="db.your-supabase-url.supabase.co",
    database="postgres",
    user="postgres",
    password="your-password"
)

# SQLite 연결
sqlite_conn = sqlite3.connect("/var/lib/carematch/carematch.db")

def migrate_users():
    pg_cursor = pg_conn.cursor()
    sqlite_cursor = sqlite_conn.cursor()

    pg_cursor.execute("SELECT id, email, name, role, phone, avatar_url, created_at FROM users")
    users = pg_cursor.fetchall()

    for user in users:
        sqlite_cursor.execute("""
            INSERT INTO users (id, email, name, role, phone, avatar_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, user)

    sqlite_conn.commit()
    print(f"✓ {len(users)}명의 사용자 마이그레이션 완료")

def migrate_job_postings():
    pg_cursor = pg_conn.cursor()
    sqlite_cursor = sqlite_conn.cursor()

    pg_cursor.execute("""
        SELECT id, guardian_id, title, description, location,
               salary_min, salary_max, work_schedule, status, created_at
        FROM job_postings
    """)
    jobs = pg_cursor.fetchall()

    for job in jobs:
        sqlite_cursor.execute("""
            INSERT INTO job_postings
            (id, guardian_id, title, description, location, salary_min, salary_max, work_schedule, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, job)

    sqlite_conn.commit()
    print(f"✓ {len(jobs)}개의 구인글 마이그레이션 완료")

# 실행
migrate_users()
migrate_job_postings()
# ... 나머지 테이블도 동일하게 마이그레이션

pg_conn.close()
sqlite_conn.close()
```

#### 5.2 통합 테스트 체크리스트 (Day 11)

| 기능 | 테스트 항목 | 상태 |
|------|-----------|------|
| **인증** | 카카오 로그인 → JWT 발급 | [ ] |
| **인증** | 네이버 로그인 → JWT 발급 | [ ] |
| **인증** | JWT 만료 시 자동 로그아웃 | [ ] |
| **구인글** | 보호자가 구인글 작성 | [ ] |
| **구인글** | 간병인이 구인글 검색 | [ ] |
| **구인글** | 간병인이 지원하기 | [ ] |
| **채팅** | WebSocket 실시간 메시지 | [ ] |
| **채팅** | 읽음 표시 업데이트 | [ ] |
| **성능** | API 응답 시간 < 200ms | [ ] |
| **성능** | 페이지 로드 < 2초 | [ ] |

---

## 💰 비용 비교

| 항목 | AS-IS (Vercel + Supabase) | TO-BE (Cloudflare + 자체) | 절감 |
|------|--------------------------|--------------------------|------|
| Frontend 호스팅 | Vercel Pro $20/월 | Cloudflare Pages $0 | -$20 |
| Backend API | Vercel Functions 포함 | 자체 서버 $0 | $0 |
| Database | Supabase Pro $25/월 | SQLite $0 | -$25 |
| Realtime | Supabase 포함 | WebSocket $0 | $0 |
| Storage | Supabase 포함 | Nginx $0 | $0 |
| **총계** | **$55/월 ($660/년)** | **$0/월** | **-100%** |

---

## ⚠️ 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| SQLite 동시성 제한 | 중 | WAL 모드 + Connection Pool 설정 |
| 서버 단일 장애점 | 고 | 자동 백업 + 모니터링 (Uptime Kuma) |
| Cloudflare 트래픽 제한 | 중 | 무료 플랜 10만 req/day (충분) |
| 카카오/네이버 OAuth 리다이렉트 | 중 | 새 도메인으로 OAuth 앱 재등록 |
| 데이터 마이그레이션 실패 | 고 | Supabase 백업 3개월 보관 |

---

## 📝 체크리스트

### Phase 1 완료 조건
- [ ] Supabase 전체 데이터 백업 (JSON)
- [ ] API 엔드포인트 28개 문서화
- [ ] 서버 61.245.248.247 SSH 접속 확인
- [ ] SQLite 3.45+ 설치 확인

### Phase 2 완료 조건
- [ ] SQLite 데이터베이스 생성 (`carematch.db`)
- [ ] FastAPI 서버 실행 (`http://61.245.248.247:8000`)
- [ ] Nginx 프록시 설정 완료
- [ ] SSL 인증서 발급 (Let's Encrypt)
- [ ] JWT 인증 테스트 성공

### Phase 3 완료 조건
- [ ] Vite 프로젝트 생성 및 의존성 설치
- [ ] React Router 설정 완료
- [ ] 기존 컴포넌트 50% 이상 마이그레이션
- [ ] shadcn/ui 재설치 및 스타일 확인
- [ ] WebSocket 채팅 테스트 성공

### Phase 4 완료 조건
- [ ] Vite 프로덕션 빌드 성공
- [ ] Cloudflare Pages 배포 완료
- [ ] 커스텀 도메인 연결 (선택)
- [ ] HTTPS 자동 적용 확인

### Phase 5 완료 조건
- [ ] PostgreSQL → SQLite 데이터 이관 100%
- [ ] 10개 핵심 기능 테스트 통과
- [ ] 성능 벤치마크 (API < 200ms, 페이지 < 2초)
- [ ] 자동 백업 스크립트 등록 (cron)
- [ ] 모니터링 대시보드 설정

---

## 🚀 다음 단계

1. **Phase 1 즉시 시작**: 현재 Supabase 데이터 백업
2. **서버 접속 확인**: 61.245.248.247 SSH 키 설정
3. **도메인 준비**: api.carematch.com DNS 설정 (A 레코드)
4. **Cloudflare 계정**: Pages 프로젝트 생성 준비

---

*작성일: 2026-01-19*
*담당: Orchestrator Agent*
*승인 대기 중...*
