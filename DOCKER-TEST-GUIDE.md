# Docker 로컬 빌드 및 테스트 가이드

> CareMatch V3 Docker 이미지 빌드 및 테스트 절차

---

## 📋 사전 요구사항

### 1. Docker Desktop 설치 및 실행

```bash
# Docker 설치 확인
docker --version

# Docker daemon 확인
docker info
```

**Docker Desktop이 실행되지 않은 경우:**
- macOS: Applications에서 Docker Desktop 실행
- 시스템 트레이에 Docker 아이콘이 표시될 때까지 대기

### 2. PostgreSQL 실행

```bash
# PostgreSQL 실행 확인
pg_isready -h localhost -p 5432

# 실행되지 않은 경우
brew services start postgresql@15
# 또는
pg_ctl -D /usr/local/var/postgresql@15 start
```

### 3. 환경 변수 설정

```bash
# .env.local 파일 생성
cp .env.example .env.local

# 환경 변수 설정
vi .env.local
```

**필수 환경 변수:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carematch_v3
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here  # openssl rand -base64 32
```

---

## 🚀 빌드 및 테스트 절차

### Step 1: Docker 이미지 빌드

```bash
# 빌드 스크립트 실행
./scripts/docker-build.sh

# 또는 수동 빌드
docker build -t carematch-v3:latest .
```

**예상 빌드 시간:** 3-5분 (최초), 1-2분 (캐시 사용 시)

**빌드 성공 확인:**
```bash
docker images carematch-v3
```

### Step 2: 로컬 테스트

```bash
# 테스트 스크립트 실행
./scripts/docker-test-local.sh
```

**테스트 스크립트가 수행하는 작업:**
1. ✓ 환경 변수 파일 확인
2. ✓ Docker 이미지 확인
3. ✓ PostgreSQL 연결 확인
4. ✓ Redis 컨테이너 시작
5. ✓ Next.js 컨테이너 시작
6. ✓ Health Check 수행
7. ✓ 로그 출력

### Step 3: 동작 확인

```bash
# Health Check
curl http://localhost:3000/api/health

# 브라우저에서 확인
open http://localhost:3000

# 실시간 로그 확인
docker logs -f care_test_frontend
```

### Step 4: 테스트 정리

```bash
# 정리 스크립트 실행
./scripts/docker-stop-local.sh

# 또는 수동 정리
docker stop care_test_frontend care_test_redis
docker rm care_test_frontend care_test_redis
```

---

## 🐛 문제 해결

### 문제 1: Docker daemon이 실행되지 않음

**증상:**
```
Cannot connect to the Docker daemon
```

**해결:**
```bash
# Docker Desktop 실행
open -a Docker

# 시스템 트레이에 Docker 아이콘이 나타날 때까지 대기 (약 30초)
```

### 문제 2: PostgreSQL 연결 실패

**증상:**
```
❌ PostgreSQL이 실행되지 않았습니다.
```

**해결:**
```bash
# PostgreSQL 실행
brew services start postgresql@15

# 또는
pg_ctl -D /usr/local/var/postgresql@15 start

# 확인
pg_isready -h localhost -p 5432
```

### 문제 3: Health Check 실패

**증상:**
```
❌ Health Check 실패
```

**해결:**
```bash
# 컨테이너 로그 확인
docker logs care_test_frontend

# 환경 변수 확인
docker exec care_test_frontend env | grep DATABASE_URL

# 데이터베이스 연결 테스트
docker exec care_test_frontend node -e "const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL }); pool.query('SELECT NOW()').then(r => console.log('OK:', r.rows[0])).catch(e => console.error('ERROR:', e)).finally(() => pool.end())"
```

### 문제 4: 빌드 실패

**증상:**
```
ERROR [builder X/Y] ...
```

**해결:**
```bash
# 빌드 캐시 정리
docker builder prune -f

# 재빌드
docker build --no-cache -t carematch-v3:latest .
```

### 문제 5: 포트 충돌

**증상:**
```
port is already allocated
```

**해결:**
```bash
# 3000번 포트 사용 프로세스 확인
lsof -i :3000

# 프로세스 종료
kill -9 <PID>

# 또는 다른 포트 사용
docker run -p 9000:3000 ...
```

---

## 📊 검증 체크리스트

### 빌드 검증
- [ ] Docker 이미지 생성 성공
- [ ] 이미지 크기 확인 (예상: ~200-300MB)
- [ ] 빌드 에러 없음

### 실행 검증
- [ ] Redis 컨테이너 정상 실행
- [ ] Next.js 컨테이너 정상 실행
- [ ] Health Check 성공
- [ ] 로그에 에러 없음

### 기능 검증
- [ ] 메인 페이지 접속 (http://localhost:3000)
- [ ] API Health Check 성공 (/api/health)
- [ ] PostgreSQL 연결 정상
- [ ] NextAuth 세션 동작 확인

---

## 🔧 고급 사용법

### 수동 컨테이너 실행

```bash
# Redis 실행
docker run -d \
  --name care_redis \
  --network host \
  redis:7-alpine

# Next.js 실행
docker run -d \
  --name care_frontend \
  --network host \
  --env-file .env.local \
  -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/carematch_v3" \
  carematch-v3:latest
```

### Docker Compose 사용

```bash
# docker-compose.care.yml 사용
docker-compose -f docker-compose.care.yml up -d

# 로그 확인
docker-compose -f docker-compose.care.yml logs -f

# 정지
docker-compose -f docker-compose.care.yml down
```

### 컨테이너 내부 접속

```bash
# Shell 접속
docker exec -it care_test_frontend sh

# 데이터베이스 연결 테스트
docker exec -it care_test_frontend node -e "require('@/lib/db').checkConnection().then(console.log)"

# 환경 변수 확인
docker exec care_test_frontend printenv
```

---

## 📝 다음 단계

로컬 Docker 테스트가 성공했다면:

1. **서버 배포 준비**
   - ws-248-247 서버 접속 확인
   - PostgreSQL 설치 및 설정
   - Cloudflare Tunnel 설정

2. **배포 실행**
   ```bash
   # 서버에 이미지 전송
   docker save carematch-v3:latest | gzip > carematch-v3.tar.gz
   scp carematch-v3.tar.gz user@ws-248-247:/tmp/

   # 서버에서 로드
   ssh user@ws-248-247
   docker load < /tmp/carematch-v3.tar.gz
   ```

3. **모니터링 설정**
   - 로그 수집
   - Health Check 모니터링
   - 알림 설정

---

**작성일:** 2026-02-04
**버전:** 1.0
**담당:** Ph.D SNT Go.
