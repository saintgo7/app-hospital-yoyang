# CareMatch V3 배포 체크리스트

> **Quick Reference**: 배포 전 필수 확인 사항  
> **Target**: ws-248-247 → care.abada.kr  
> **작성일**: 2026-02-04

---

## 📋 배포 전 (로컬 머신)

### 코드 준비
- [ ] `pnpm typecheck` 통과
- [ ] `pnpm build` 성공
- [ ] `./scripts/security-check.sh` 통과 (0개 이슈)
- [ ] Git 커밋 완료
- [ ] Git 푸시 완료 (main 브랜치)

### 환경 변수 준비
- [ ] `.env.production` 템플릿 확인
- [ ] PostgreSQL 비밀번호 준비
- [ ] `openssl rand -base64 32`로 NEXTAUTH_SECRET 생성
- [ ] Kakao OAuth Client ID/Secret 확인
- [ ] Naver OAuth Client ID/Secret 확인

---

## 🚀 서버 배포 (ws-248-247)

### Step 1: 서버 준비
- [ ] SSH 접속: `ssh ws-248-247`
- [ ] 배포 디렉토리 생성: `/data/blackpc/app-care/carematch-v3`
- [ ] 디렉토리 소유권 설정: `sudo chown -R $USER:$USER ...`

### Step 2: 코드 배포
- [ ] Git clone 또는 rsync로 코드 배포
- [ ] .env.production 생성 및 설정
- [ ] 환경 변수 값 입력 (DATABASE_URL, NEXTAUTH_SECRET 등)

### Step 3: 배포 실행
- [ ] `./scripts/docker-deploy.sh` 실행
- [ ] PostgreSQL DB 생성 확인
- [ ] DB 마이그레이션 성공 확인
- [ ] Docker 이미지 빌드 성공
- [ ] 컨테이너 시작 확인
- [ ] Health Check 성공: `curl http://localhost:9000/api/health`

---

## 🌐 Cloudflare Tunnel 설정

### Tunnel 설정
- [ ] 기존 Tunnel 확인: `sudo systemctl status cloudflared`
- [ ] config.yml 편집: `sudo vi /etc/cloudflared/config.yml`
- [ ] care.abada.kr ingress 추가 (포트 9000)
- [ ] 설정 검증: `cloudflared tunnel ingress validate`
- [ ] Tunnel 재시작: `sudo systemctl restart cloudflared`
- [ ] 로그 확인: `sudo journalctl -u cloudflared -f`

### DNS 설정
- [ ] Cloudflare Dashboard 로그인
- [ ] abada.kr 도메인 선택
- [ ] CNAME 레코드 추가:
  - Type: CNAME
  - Name: care
  - Target: `<tunnel-id>.cfargotunnel.com`
  - Proxy: ✅ Proxied
- [ ] DNS 전파 확인: `dig care.abada.kr`

---

## ✅ 배포 검증

### 로컬 테스트 (서버에서)
- [ ] `curl http://localhost:9000` → 200 응답
- [ ] `curl http://localhost:9000/api/health` → JSON 응답

### 외부 테스트
- [ ] `curl https://care.abada.kr` → 200 응답
- [ ] `curl https://care.abada.kr/api/health` → JSON 응답

### 브라우저 테스트
- [ ] https://care.abada.kr 접속 → 홈페이지 로드
- [ ] 로그인 페이지 → Kakao/Naver 버튼 표시
- [ ] Kakao 로그인 → 리다이렉트 성공
- [ ] Naver 로그인 → 리다이렉트 성공
- [ ] 구인글 목록 → DB 데이터 표시
- [ ] 채팅 기능 → Polling 동작 확인

---

## 🔐 OAuth 설정

### Kakao 개발자 콘솔
- [ ] https://developers.kakao.com 로그인
- [ ] 앱 선택
- [ ] 플랫폼 > Web > 리다이렉트 URI 추가:
  - `https://care.abada.kr/api/auth/callback/kakao`
- [ ] 저장

### Naver 개발자 센터
- [ ] https://developers.naver.com/apps 로그인
- [ ] 애플리케이션 선택
- [ ] API 설정 > Callback URL 추가:
  - `https://care.abada.kr/api/auth/callback/naver`
- [ ] 저장

---

## 📊 운영 준비

### 모니터링 설정
- [ ] 로그 모니터링 확인:
  - `docker compose -f docker-compose.care.yml logs -f`
  - `sudo journalctl -u cloudflared -f`
- [ ] 시스템 리소스 확인: `docker stats`

### 백업 설정
- [ ] DB 백업 스크립트 테스트:
  ```bash
  pg_dump -U postgres carematch_v3 > backup_test.sql
  ```
- [ ] Cron 백업 스케줄 설정 (선택)

### 문서화
- [ ] README.md 업데이트
- [ ] 배포 가이드 확인
- [ ] 운영 매뉴얼 작성

---

## 🚨 긴급 롤백 절차

배포 후 문제 발생 시:

### 즉시 실행
```bash
# 1. 컨테이너 중지
docker compose -f docker-compose.care.yml down

# 2. 이전 버전으로 복구
git checkout <previous-commit>

# 3. 재배포
./scripts/docker-deploy.sh
```

### Cloudflare Tunnel 제거 (최후 수단)
```bash
# config.yml에서 care.abada.kr 제거
sudo vi /etc/cloudflared/config.yml

# Tunnel 재시작
sudo systemctl restart cloudflared
```

---

## 📞 연락처

| 구분 | 담당자 | 연락처 |
|------|--------|--------|
| 개발 | Ph.D SNT Go. | - |
| 인프라 | - | - |
| 긴급 | - | - |

---

## 📝 배포 이력

| 날짜 | 버전 | 변경 사항 | 담당자 |
|------|------|----------|--------|
| 2026-02-04 | 1.0.0 | 초기 배포 | Ph.D SNT Go. |

---

**최종 점검**: 모든 체크박스를 확인한 후 배포를 진행하세요.

**배포 시간**: 약 30-60분 소요 예상

**상태**: ⬜ 준비 중 / ⬜ 배포 중 / ⬜ 완료
