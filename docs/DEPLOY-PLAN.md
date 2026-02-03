# CareMatch V3 배포 계획서

> **배포 대상**: ws-248-247 서버
> **도메인**: care.abada.kr
> **배포 방식**: Cloudflare Tunnel + Docker Compose + PostgreSQL
> **작성일**: 2026-02-03

---

## 📋 배포 개요

### 변경 사항
| 항목 | 기존 (개발) | 변경 (프로덕션) |
|------|-----------|----------------|
| **Database** | Supabase (Cloud) | PostgreSQL (ws-248-247 로컬) |
| **Auth** | Supabase Auth | NextAuth.js (자체) |
| **Realtime** | Supabase Realtime | 제거 (향후 Socket.io 검토) |
| **배포** | Vercel | Docker + Cloudflare Tunnel |
| **도메인** | vercel.app | care.abada.kr |
| **포트** | - | 9000 (충돌 없음 확인) |

### 배포 방식 결정

**선택**: Cloudflare Tunnel 직접 연결 ✅

**결정 이유**:
1. **완전한 기능 지원**: Next.js SSR, API Routes, NextAuth DB 세션 모두 지원
2. **DB 직접 연결**: PostgreSQL 직접 연결 가능 (추가 프록시 불필요)
3. **검증된 방식**: ws.abada.co.kr과 동일한 배포 구성
4. **대상 사용자**: 한국 고령층 대상 → 글로벌 CDN 불필요
5. **무료 & 보안**: Cloudflare Tunnel 무료, DDoS 보호, 암호화 터널

**대안 (Cloudflare Pages) 기각 이유**:
- ❌ Next.js SSR/API Routes 제한적
- ❌ PostgreSQL 직접 연결 불가
- ❌ NextAuth 세션 관리 복잡

### 배포 아키텍처

```
[사용자]
   ↓ HTTPS
[Cloudflare Tunnel] care.abada.kr
   ↓ 암호화 터널
[ws-248-247 서버]
   ├─ [Nginx] 리버스 프록시 (선택사항 - 로컬 접근용)
   ├─ [Docker Compose]
   │   ├─ care_frontend (Next.js) :9000 ← Tunnel 연결
   │   └─ care_redis (Redis) :6379 (내부)
   └─ [PostgreSQL] :5432 (시스템 설치)
```

### 포트 할당 확인

| 도메인 | Backend | Frontend | 상태 |
|--------|---------|----------|------|
| sikyak.abada.co.kr | 5000 | 정적파일 | ✅ 운영중 |
| fire.abada.co.kr | 3000 | 7000 | ✅ 운영중 |
| ws.abada.co.kr | 8000 | 8001 | ✅ 운영중 |
| **care.abada.kr** | - | **9000** | **신규 (충돌 없음)** |

---

## 🎯 Phase 1: DB 마이그레이션 준비 (로컬 작업)

### 1-1. PostgreSQL 스키마 변환

**작업 파일**: `supabase/migrations/20260102000000_initial_schema.sql`

**변경 사항**:
```sql
-- ❌ 제거: Supabase 전용 기능
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- ❌ 변경: Supabase Auth 함수 → 세션 기반 인증
-- auth.uid() → current_user_id (application level)

-- ✅ 추가: 세션 관리 테이블
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
```

**생성할 파일**:
- `migrations/postgres/01_initial_schema.sql` - PostgreSQL용 스키마
- `migrations/postgres/02_seed_data.sql` - 초기 데이터 (선택)

---

### 1-2. Supabase 클라이언트 제거

**변경할 파일**: `src/lib/supabase.ts` → `src/lib/db.ts`

**변경 내용**:
```typescript
// ❌ 제거
import { createClient } from '@supabase/supabase-js'

// ✅ 추가 - PostgreSQL 직접 연결은 서버사이드만
// API 라우트에서 pg 또는 Prisma/Drizzle 사용
import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
```

---

### 1-3. Auth 시스템 변경

**현재**: Supabase Auth (OAuth provider)
**변경**: NextAuth.js 자체 DB 세션

**수정할 파일**:
- `src/pages/api/auth/[...nextauth].ts` - 세션 저장소를 DB로 변경
- DB Adapter 추가 (NextAuth PostgreSQL Adapter)

**환경 변수 추가**:
```env
DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/carematch_v3
```

---

### 1-4. Realtime 기능 제거 (임시)

**영향받는 파일**:
- `src/pages/chat/[roomId].tsx` - polling으로 임시 변경
- API: `/api/chat/messages` - polling endpoint 추가

**향후 계획**: Socket.io 또는 WebSocket 도입 검토

---

## 🎯 Phase 2: Docker 설정 작성

### 2-1. Dockerfile 작성

**파일**: `Dockerfile`

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# 의존성 복사 및 설치
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 소스 복사 및 빌드
COPY . .
RUN pnpm build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# 필요한 파일만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

---

### 2-2. docker-compose.yml 작성

**파일**: `docker-compose.care.yml`

```yaml
# ============================================
# care.abada.kr Docker Compose 설정
# 시스템 PostgreSQL 사용 + Docker Redis
# ============================================

services:
  # Redis 캐시 (NextAuth 세션 저장용 - 선택)
  redis:
    image: redis:7-alpine
    container_name: care_redis
    command: redis-server --appendonly yes
    volumes:
      - care_redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - care_network
    restart: unless-stopped

  # Next.js 애플리케이션
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: care_frontend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      KAKAO_CLIENT_ID: ${KAKAO_CLIENT_ID}
      KAKAO_CLIENT_SECRET: ${KAKAO_CLIENT_SECRET}
      NAVER_CLIENT_ID: ${NAVER_CLIENT_ID}
      NAVER_CLIENT_SECRET: ${NAVER_CLIENT_SECRET}
      NODE_ENV: production
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${EXTERNAL_PORT:-9000}:3000"
    networks:
      - care_network
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped

volumes:
  care_redis_data:
    driver: local

networks:
  care_network:
    driver: bridge
    name: care_abada_network
```

---

### 2-3. 환경 변수 파일

**파일**: `.env.production`

```bash
# ============================================
# CareMatch V3 Production 환경 변수
# ============================================

# PostgreSQL (ws-248-247 로컬 DB)
DATABASE_URL=postgresql://postgres:PASSWORD@host.docker.internal:5432/carematch_v3

# NextAuth
NEXTAUTH_URL=https://care.abada.kr
NEXTAUTH_SECRET=  # openssl rand -base64 32

# Kakao OAuth
KAKAO_CLIENT_ID=
KAKAO_CLIENT_SECRET=

# Naver OAuth
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# 포트 설정
EXTERNAL_PORT=9000

# Redis (선택)
REDIS_URL=redis://redis:6379/0
```

---

## 🎯 Phase 3: 서버 배포 준비 (ws-248-247)

### 3-1. 사전 확인 사항

**기존 서비스 포트 (충돌 방지)**:
| 도메인 | 포트 | 비고 |
|--------|------|------|
| sikyak.abada.co.kr | 5000 | Backend |
| fire.abada.co.kr | 3000, 7000 | Backend + Frontend |
| ws.abada.co.kr | 8000, 8001 | Backend + Frontend |
| **care.abada.kr** | **9000** | **신규 할당** |

**사용 가능 포트**: 9000 (충돌 없음)

---

### 3-2. PostgreSQL 데이터베이스 생성

```bash
# SSH 접속
ssh ws-248-247

# 데이터베이스 생성
sudo -u postgres psql -c "CREATE DATABASE carematch_v3;"

# 사용자 권한 설정 (필요시)
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE carematch_v3 TO postgres;"

# 접속 테스트
sudo -u postgres psql carematch_v3 -c "\dt"
```

---

### 3-3. 프로젝트 배포 디렉토리 생성

```bash
# 배포 디렉토리 생성
sudo mkdir -p /data/blackpc/app-care/carematch-v3
sudo chown -R $USER:$USER /data/blackpc/app-care/carematch-v3

cd /data/blackpc/app-care/carematch-v3
```

---

## 🎯 Phase 4: 코드 배포 및 빌드

### 4-1. Git 코드 가져오기

```bash
cd /data/blackpc/app-care/carematch-v3

# Git clone (또는 rsync로 복사)
git clone <repository-url> .

# 또는 로컬에서 rsync
# rsync -avz --exclude 'node_modules' --exclude '.next' \
#   /Users/saint/01_DEV/app-hospital-yoyang/ \
#   ws-248-247:/data/blackpc/app-care/carematch-v3/
```

---

### 4-2. 환경 변수 설정

```bash
cd /data/blackpc/app-care/carematch-v3

# .env.production 파일 생성
nano .env.production
```

**입력 내용**:
```bash
DATABASE_URL=postgresql://postgres:REAL_PASSWORD@host.docker.internal:5432/carematch_v3
NEXTAUTH_URL=https://care.abada.kr
NEXTAUTH_SECRET=<openssl rand -base64 32 결과>
KAKAO_CLIENT_ID=<실제 카카오 클라이언트 ID>
KAKAO_CLIENT_SECRET=<실제 카카오 시크릿>
NAVER_CLIENT_ID=<실제 네이버 클라이언트 ID>
NAVER_CLIENT_SECRET=<실제 네이버 시크릿>
EXTERNAL_PORT=9000
```

---

### 4-3. DB 마이그레이션 실행

```bash
# PostgreSQL에 스키마 적용
sudo -u postgres psql carematch_v3 < migrations/postgres/01_initial_schema.sql

# 초기 데이터 삽입 (선택)
sudo -u postgres psql carematch_v3 < migrations/postgres/02_seed_data.sql
```

---

### 4-4. Docker 이미지 빌드 및 실행

```bash
cd /data/blackpc/app-care/carematch-v3

# 이미지 빌드
docker compose -f docker-compose.care.yml build

# 컨테이너 시작
docker compose -f docker-compose.care.yml up -d

# 상태 확인
docker compose -f docker-compose.care.yml ps

# 로그 확인
docker compose -f docker-compose.care.yml logs -f frontend
```

---

## 🎯 Phase 5: Cloudflare Tunnel 설정

### 5-1. 기존 Tunnel 확인 (ws-248-247 서버)

**중요**: ws-248-247 서버에는 이미 Cloudflare Tunnel이 설치되어 있습니다.

```bash
# SSH 접속
ssh ws-248-247

# 기존 Tunnel 확인
sudo systemctl status cloudflared

# Tunnel 설정 파일 확인
cat /etc/cloudflared/config.yml
# 또는
cat ~/.cloudflared/config.yml
```

---

### 5-2. Tunnel 설정 업데이트

**방법 A: 기존 Tunnel에 도메인 추가 (권장)**

기존 설정 파일에 care.abada.kr 추가:

**파일**: `/etc/cloudflared/config.yml`

```yaml
tunnel: <기존-tunnel-id>
credentials-file: /root/.cloudflared/<기존-tunnel-id>.json

ingress:
  # 기존 서비스들
  - hostname: ws.abada.kr
    service: http://localhost:8000

  - hostname: fire.abada.kr
    service: http://localhost:3000

  - hostname: sikyak.abada.kr
    service: http://localhost:5000

  # CareMatch V3 추가
  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      tlsTimeout: 10s
      keepAliveTimeout: 90s
      keepAliveConnections: 100

  # Catch-all (항상 마지막)
  - service: http_status:404
```

**방법 B: 새 Tunnel 생성 (필요시)**

```bash
# Cloudflare Tunnel 설치 (이미 설치되어 있으면 생략)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Tunnel 인증 (최초 1회)
cloudflared tunnel login

# 새 Tunnel 생성
cloudflared tunnel create care-abada-kr

# 생성된 Tunnel ID 확인
cloudflared tunnel list
```

---

### 5-3. DNS 레코드 추가

**Cloudflare Dashboard > DNS 설정**:

1. **도메인**: abada.kr
2. **레코드 추가**:
   - Type: `CNAME`
   - Name: `care`
   - Target: `<tunnel-id>.cfargotunnel.com`
   - Proxy status: ✅ **Proxied** (오렌지 클라우드)
   - TTL: Auto

**예시**:
```
Type: CNAME
Name: care
Content: abc123def456.cfargotunnel.com
Proxy: Proxied (오렌지 클라우드)
```

---

### 5-4. Tunnel 설정 테스트

```bash
# 설정 파일 유효성 검사
cloudflared tunnel ingress validate

# 예상 출력:
# Validating rules from /etc/cloudflared/config.yml
# OK
```

---

### 5-5. Tunnel 서비스 재시작

```bash
# systemd 서비스로 실행 중인 경우
sudo systemctl restart cloudflared
sudo systemctl status cloudflared

# 로그 확인
sudo journalctl -u cloudflared -f

# 또는 수동 실행 (테스트용)
cloudflared tunnel --config /etc/cloudflared/config.yml run
```

---

### 5-6. Cloudflare Tunnel 설정 확인 체크리스트

- [ ] Tunnel 서비스 실행 중 (`systemctl status cloudflared`)
- [ ] config.yml에 care.abada.kr 추가됨
- [ ] 포트 9000으로 설정됨
- [ ] DNS CNAME 레코드 추가 (Proxied)
- [ ] `cloudflared tunnel ingress validate` 통과
- [ ] 로그에 에러 없음 (`journalctl -u cloudflared`)

---

### 5-7. Cloudflare Tunnel 추가 설정 (선택)

**성능 최적화**:

```yaml
# config.yml에 추가 가능한 옵션
ingress:
  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      # 타임아웃 설정
      connectTimeout: 30s
      tlsTimeout: 10s
      tcpKeepAlive: 30s
      keepAliveTimeout: 90s

      # 연결 풀 설정
      keepAliveConnections: 100

      # HTTP/2 설정
      http2Origin: true

      # 보안
      noTLSVerify: true  # self-signed 인증서 허용
      disableChunkedEncoding: false
```

**접근 제어 (선택)**:

Cloudflare Dashboard에서 Access 정책 설정 가능:
- Zero Trust > Access > Applications
- care.abada.kr에 대한 접근 정책 추가
- 예: 특정 IP 또는 인증된 사용자만 접근

---

## 🎯 Phase 6: Nginx 설정 (선택사항 - 불필요)

**⚠️ 중요**: Cloudflare Tunnel이 포트 9000에 직접 연결하므로 Nginx는 **불필요**합니다.

**Nginx가 필요한 경우**:
- 로컬 네트워크에서 직접 접근 (http://서버IP:9000 대신 http://care.local)
- SSL 인증서를 서버에서 직접 관리
- 추가 로드밸런싱이나 캐싱이 필요한 경우

**대부분의 경우 생략 가능**합니다. Cloudflare Tunnel이 모든 역할을 수행합니다.

**파일**: `/etc/nginx/sites-available/care.abada.co.kr`

```nginx
server {
    listen 80;
    server_name care.abada.kr;

    location / {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/care.abada.co.kr \
  /etc/nginx/sites-enabled/care.abada.co.kr

# Nginx 테스트 및 재시작
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Phase 7: 배포 테스트 및 검증

### 7-1. 헬스체크

```bash
# 로컬 접속 테스트
curl http://localhost:9000

# 외부 접속 테스트
curl https://care.abada.kr

# 헬스체크 API
curl https://care.abada.kr/api/health
```

---

### 7-2. 기능 테스트

| 기능 | 테스트 방법 | 예상 결과 |
|------|-----------|----------|
| 홈페이지 | https://care.abada.kr | 정상 로드 |
| 로그인 | Kakao/Naver OAuth | 리다이렉트 성공 |
| 구인글 목록 | /jobs | DB 데이터 표시 |
| 지원하기 | 간병인 로그인 후 지원 | DB 저장 확인 |
| 채팅 | /chat | Polling 방식 동작 |

---

### 7-3. 로그 모니터링

```bash
# 컨테이너 로그
docker compose -f docker-compose.care.yml logs -f

# PostgreSQL 로그
sudo tail -f /var/log/postgresql/postgresql-*.log

# Cloudflare Tunnel 로그
sudo journalctl -u cloudflared -f
```

---

## 🎯 Phase 8: 운영 관리

### 8-1. 주요 명령어

```bash
# 컨테이너 시작/중지
docker compose -f docker-compose.care.yml up -d
docker compose -f docker-compose.care.yml down

# 재시작
docker compose -f docker-compose.care.yml restart

# 업데이트 배포
git pull
docker compose -f docker-compose.care.yml build
docker compose -f docker-compose.care.yml up -d
```

---

### 8-2. 백업 계획

**데이터베이스 백업**:
```bash
# 백업 스크립트
pg_dump -U postgres carematch_v3 > backup_$(date +%Y%m%d).sql

# 복원
psql -U postgres carematch_v3 < backup_20260203.sql
```

---

## 📋 체크리스트

### Phase 1: 로컬 준비
- [ ] PostgreSQL 스키마 변환 완료
- [ ] Supabase 클라이언트 제거
- [ ] NextAuth DB adapter 설정
- [ ] Realtime 제거 및 polling 변경

### Phase 2: Docker 설정
- [ ] Dockerfile 작성
- [ ] docker-compose.care.yml 작성
- [ ] .env.production 준비

### Phase 3: 서버 준비
- [ ] PostgreSQL DB 생성 (carematch_v3)
- [ ] 배포 디렉토리 생성
- [ ] 포트 9000 확인

### Phase 4: 배포
- [ ] 코드 배포 (Git/rsync)
- [ ] 환경 변수 설정
- [ ] DB 마이그레이션 실행
- [ ] Docker 빌드 및 실행

### Phase 5: Cloudflare
- [ ] Tunnel 생성
- [ ] DNS 레코드 추가 (care.abada.kr)
- [ ] Tunnel 설정 및 재시작

### Phase 6: 테스트
- [ ] 로컬 접속 테스트
- [ ] 외부 접속 테스트
- [ ] 기능 테스트 (로그인, 구인글, 지원, 채팅)

### Phase 7: 운영
- [ ] 로그 모니터링 설정
- [ ] 백업 스크립트 작성
- [ ] 문서화 완료

---

## 🔧 예상 이슈 및 해결

### 이슈 1: NextAuth RLS 정책 오류

**문제**: Supabase RLS 정책이 auth.uid()를 사용하므로 PostgreSQL에서 작동 안 함

**해결**:
- RLS 정책 제거 또는 수정
- Application level에서 권한 체크

---

### 이슈 2: Realtime 기능 누락

**문제**: Supabase Realtime 제거로 채팅 실시간 업데이트 안됨

**해결**:
- Polling 방식으로 임시 대응 (3-5초 간격)
- 향후 Socket.io 도입 검토

---

### 이슈 3: OAuth 리다이렉트 URI

**문제**: 개발 환경 URI로 설정되어 있음

**해결**:
- Kakao/Naver 개발자 콘솔에서 `https://care.abada.kr/api/auth/callback/kakao` 추가
- Naver도 동일하게 추가

---

## 📊 예상 소요 시간

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 1 | DB 마이그레이션 준비 | 2-3시간 |
| 2 | Docker 설정 작성 | 1시간 |
| 3 | 서버 준비 | 30분 |
| 4 | 코드 배포 및 빌드 | 1시간 |
| 5 | Cloudflare Tunnel | 30분 |
| 6 | Nginx 설정 | 30분 (선택) |
| 7 | 테스트 및 검증 | 1-2시간 |
| **합계** | | **6-8시간** |

---

## 📞 참고 자료

- **참고 프로젝트**: `/Users/saint/01_DEV/saas-ws-abada-co-kr/`
- **배포 가이드**: `saas-ws-abada-co-kr/DEPLOY-WS.md`
- **Docker 설정**: `saas-ws-abada-co-kr/docker-compose.ws.yml`
- **현재 DB 스키마**: `supabase/migrations/20260102000000_initial_schema.sql`

---

---

## 📝 문서 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| 1.0 | 2026-02-03 | 초안 작성 |
| 1.1 | 2026-02-03 | 포트 9000 확정, Cloudflare Tunnel 상세화 |

---

*최종 업데이트: 2026-02-03*
*작성자: Claude Code*
*상태: Phase 1 준비 완료*
