# CareMatch V3 서버 배포 가이드

> **대상 서버**: ws-248-247  
> **도메인**: care.abada.kr  
> **포트**: 9000  
> **작성일**: 2026-02-04

---

## 📋 배포 개요

### 준비된 파일
- ✅ `Dockerfile` - Next.js 프로덕션 빌드
- ✅ `docker-compose.care.yml` - Docker Compose 설정
- ✅ `.env.production` - 프로덕션 환경 변수 템플릿
- ✅ `migrations/postgres/01_initial_schema.sql` - PostgreSQL 스키마
- ✅ `migrations/postgres/02_seed_data.sql` - 초기 데이터 (선택)
- ✅ `scripts/docker-deploy.sh` - 배포 자동화 스크립트
- ✅ `scripts/security-check.sh` - 보안 검사 스크립트

---

## 🚀 배포 절차

### Step 1: 로컬 준비 (개발 머신)

#### 1-1. 최종 테스트

```bash
# 타입 체크
pnpm typecheck

# 빌드 테스트
pnpm build

# 보안 검사
./scripts/security-check.sh
```

#### 1-2. Git 커밋

```bash
git add .
git commit -m "feat: production deployment ready

- Add PostgreSQL migrations
- Add deployment scripts
- Add server deployment guide

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin main
```

---

### Step 2: 서버 준비 (ws-248-247)

#### 2-1. SSH 접속

```bash
ssh ws-248-247
# 또는
ssh username@ws-248-247-ip
```

#### 2-2. 배포 디렉토리 생성

```bash
sudo mkdir -p /data/blackpc/app-care/carematch-v3
sudo chown -R $USER:$USER /data/blackpc/app-care/carematch-v3
cd /data/blackpc/app-care/carematch-v3
```

#### 2-3. 코드 가져오기

**방법 A: Git Clone (권장)**

```bash
cd /data/blackpc/app-care/carematch-v3

# Git repository clone
git clone <repository-url> .

# 또는 특정 브랜치
git clone -b main <repository-url> .
```

**방법 B: rsync로 복사**

```bash
# 로컬 머신에서 실행
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  /Users/saint/01_DEV/app-hospital-yoyang/ \
  ws-248-247:/data/blackpc/app-care/carematch-v3/
```

---

### Step 3: 환경 변수 설정

#### 3-1. .env.production 생성

```bash
cd /data/blackpc/app-care/carematch-v3

# .env.production 파일 생성
cp .env.example .env.production
vi .env.production
```

#### 3-2. 환경 변수 입력

```bash
# ============================================
# CareMatch V3 Production 환경 변수
# ============================================

# PostgreSQL (ws-248-247 로컬 DB)
DATABASE_URL=postgresql://postgres:REAL_PASSWORD@host.docker.internal:5432/carematch_v3

# NextAuth
NEXTAUTH_URL=https://care.abada.kr
NEXTAUTH_SECRET=  # openssl rand -base64 32

# Kakao OAuth
KAKAO_CLIENT_ID=your-kakao-client-id
KAKAO_CLIENT_SECRET=your-kakao-client-secret

# Naver OAuth
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

# 포트 설정
EXTERNAL_PORT=9000

# Redis
REDIS_URL=redis://redis:6379/0
```

**중요**: 
- `DATABASE_URL`의 비밀번호를 실제 PostgreSQL 비밀번호로 변경
- `NEXTAUTH_SECRET` 생성: `openssl rand -base64 32`
- Kakao/Naver OAuth 실제 값 입력

---

### Step 4: 배포 실행

#### 4-1. 배포 스크립트 실행

```bash
cd /data/blackpc/app-care/carematch-v3

# 배포 스크립트 실행
./scripts/docker-deploy.sh
```

**스크립트가 자동으로 수행하는 작업**:
1. ✓ 사전 확인 (파일, PostgreSQL, Docker)
2. ✓ PostgreSQL DB 생성 (carematch_v3)
3. ✓ DB 마이그레이션 실행
4. ✓ 기존 컨테이너 중지
5. ✓ Docker 이미지 빌드
6. ✓ 컨테이너 시작
7. ✓ Health Check

#### 4-2. 배포 확인

```bash
# 컨테이너 상태 확인
docker compose -f docker-compose.care.yml ps

# 로그 확인
docker compose -f docker-compose.care.yml logs -f frontend

# Health Check
curl http://localhost:9000/api/health
```

**예상 출력**:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 123.45
}
```

---

### Step 5: Cloudflare Tunnel 설정

#### 5-1. 기존 Tunnel 확인

```bash
# Tunnel 서비스 상태
sudo systemctl status cloudflared

# Tunnel 설정 파일 확인
cat /etc/cloudflared/config.yml
```

#### 5-2. config.yml 업데이트

```bash
# 설정 파일 편집
sudo vi /etc/cloudflared/config.yml
```

**추가할 내용**:
```yaml
tunnel: <existing-tunnel-id>
credentials-file: /root/.cloudflared/<existing-tunnel-id>.json

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

#### 5-3. 설정 검증

```bash
# 설정 파일 유효성 검사
cloudflared tunnel ingress validate

# 예상 출력:
# Validating rules from /etc/cloudflared/config.yml
# OK
```

#### 5-4. Tunnel 재시작

```bash
# systemd 서비스 재시작
sudo systemctl restart cloudflared

# 상태 확인
sudo systemctl status cloudflared

# 로그 확인
sudo journalctl -u cloudflared -f
```

---

### Step 6: DNS 레코드 추가

#### 6-1. Cloudflare Dashboard 접속

1. [Cloudflare Dashboard](https://dash.cloudflare.com) 로그인
2. **abada.kr** 도메인 선택
3. **DNS** 메뉴 클릭

#### 6-2. CNAME 레코드 추가

| 항목 | 값 |
|------|-----|
| Type | CNAME |
| Name | care |
| Target | <tunnel-id>.cfargotunnel.com |
| Proxy status | ✅ Proxied (오렌지 클라우드) |
| TTL | Auto |

**Tunnel ID 확인**:
```bash
cloudflared tunnel list
```

---

### Step 7: 배포 검증

#### 7-1. 로컬 접속 테스트

```bash
# localhost 테스트
curl http://localhost:9000

# Health Check
curl http://localhost:9000/api/health
```

#### 7-2. 외부 접속 테스트

```bash
# 도메인 접속 테스트
curl https://care.abada.kr

# Health Check
curl https://care.abada.kr/api/health
```

#### 7-3. 브라우저 테스트

| 기능 | URL | 확인사항 |
|------|-----|---------|
| 홈페이지 | https://care.abada.kr | 정상 로드 |
| 로그인 | https://care.abada.kr/auth/signin | Kakao/Naver OAuth |
| 구인글 목록 | https://care.abada.kr/guardian/jobs | DB 데이터 표시 |
| API Health | https://care.abada.kr/api/health | JSON 응답 |

---

## 🔧 운영 관리

### 주요 명령어

```bash
# 컨테이너 시작
docker compose -f docker-compose.care.yml up -d

# 컨테이너 중지
docker compose -f docker-compose.care.yml down

# 재시작
docker compose -f docker-compose.care.yml restart

# 로그 확인
docker compose -f docker-compose.care.yml logs -f

# 로그 (최근 100줄)
docker compose -f docker-compose.care.yml logs --tail 100 frontend

# 컨테이너 상태
docker compose -f docker-compose.care.yml ps
```

### 업데이트 배포

```bash
cd /data/blackpc/app-care/carematch-v3

# 코드 업데이트
git pull origin main

# 재배포
./scripts/docker-deploy.sh
```

### 데이터베이스 백업

```bash
# 백업
pg_dump -U postgres carematch_v3 > backup_$(date +%Y%m%d_%H%M%S).sql

# 복원
psql -U postgres carematch_v3 < backup_20260204_120000.sql
```

---

## 🐛 문제 해결

### 문제 1: Health Check 실패

**증상**:
```
✗ Health Check 실패
```

**해결**:
```bash
# 컨테이너 로그 확인
docker compose -f docker-compose.care.yml logs frontend

# 데이터베이스 연결 테스트
docker exec care_frontend node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('OK:', r.rows[0])).catch(e => console.error('ERROR:', e)).finally(() => pool.end())"
```

### 문제 2: 포트 충돌

**증상**:
```
port is already allocated
```

**해결**:
```bash
# 9000번 포트 사용 프로세스 확인
lsof -i :9000

# 프로세스 종료
kill -9 <PID>
```

### 문제 3: Cloudflare Tunnel 연결 안됨

**증상**:
```
ERR error="Unable to reach the origin service"
```

**해결**:
```bash
# Tunnel 로그 확인
sudo journalctl -u cloudflared -f

# 로컬 포트 9000 확인
curl http://localhost:9000

# Tunnel 재시작
sudo systemctl restart cloudflared
```

### 문제 4: OAuth 리다이렉트 실패

**증상**: Kakao/Naver 로그인 후 에러

**해결**:
- Kakao 개발자 콘솔에서 리다이렉트 URI 추가:
  - `https://care.abada.kr/api/auth/callback/kakao`
- Naver 개발자 콘솔에서 리다이렉트 URI 추가:
  - `https://care.abada.kr/api/auth/callback/naver`

---

## 📊 모니터링

### 실시간 로그 모니터링

```bash
# 애플리케이션 로그
docker compose -f docker-compose.care.yml logs -f frontend

# PostgreSQL 로그
sudo tail -f /var/log/postgresql/postgresql-*.log

# Cloudflare Tunnel 로그
sudo journalctl -u cloudflared -f

# Nginx 로그 (사용하는 경우)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 시스템 리소스 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

---

## ✅ 배포 체크리스트

### 배포 전
- [ ] 로컬 타입 체크 통과 (`pnpm typecheck`)
- [ ] 로컬 빌드 성공 (`pnpm build`)
- [ ] 보안 검사 통과 (`./scripts/security-check.sh`)
- [ ] Git 커밋 및 푸시 완료

### 서버 준비
- [ ] 배포 디렉토리 생성
- [ ] 코드 배포 (Git clone 또는 rsync)
- [ ] .env.production 설정 완료
- [ ] PostgreSQL 비밀번호 설정
- [ ] NEXTAUTH_SECRET 생성
- [ ] OAuth Client ID/Secret 설정

### 배포 실행
- [ ] `./scripts/docker-deploy.sh` 실행 성공
- [ ] 컨테이너 정상 실행 확인
- [ ] Health Check 성공

### Cloudflare 설정
- [ ] config.yml에 care.abada.kr 추가
- [ ] 설정 검증 통과
- [ ] Tunnel 재시작 완료
- [ ] DNS CNAME 레코드 추가

### 배포 검증
- [ ] 로컬 접속 테스트 (http://localhost:9000)
- [ ] 외부 접속 테스트 (https://care.abada.kr)
- [ ] 홈페이지 정상 로드
- [ ] Kakao 로그인 동작
- [ ] Naver 로그인 동작
- [ ] 구인글 목록 표시
- [ ] 채팅 기능 동작

### 운영 준비
- [ ] 로그 모니터링 설정
- [ ] 백업 스크립트 설정
- [ ] 문서화 완료

---

**작성일**: 2026-02-04  
**버전**: 1.0  
**담당**: Ph.D SNT Go.
