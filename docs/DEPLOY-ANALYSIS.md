# CareMatch V3 배포 환경 분석

> **작성일**: 2026-02-03
> **목적**: 포트 충돌 방지 및 Cloudflare 배포 방식 결정

---

## 🔌 포트 사용 현황 (ws-248-247 서버)

### 현재 사용 중인 포트

| 도메인 | 서비스 타입 | Backend 포트 | Frontend 포트 | 상태 |
|--------|-----------|-------------|--------------|------|
| **sikyak.abada.co.kr** | 식약청 서비스 | 5000 | 정적파일 | ✅ 운영중 |
| **fire.abada.co.kr** | 소방 서비스 | 3000 | 7000 | ✅ 운영중 |
| **ws.abada.co.kr** | 워크스테이션 관리 | 8000 | 8001 | ✅ 운영중 |
| **cs.abada.co.kr** | CS 시스템 | - | - | 🟡 설정됨 |

### 포트 충돌 분석

```
✅ 사용 가능 포트:
- 9000 ~ 9999 범위

❌ 피해야 할 포트:
- 3000 (fire frontend)
- 5000 (sikyak backend)
- 7000 (fire backend)
- 8000 (ws backend)
- 8001 (ws frontend)
```

### CareMatch V3 포트 할당

| 서비스 | 포트 | 비고 |
|--------|------|------|
| **care_frontend** | **9000** | Next.js (충돌 없음) |
| care_redis (내부) | 6379 | Docker 내부 전용 |
| PostgreSQL | 5432 | 시스템 공유 |

---

## ☁️ Cloudflare 배포 방식 비교

### 옵션 1: Cloudflare Pages (정적 호스팅)

#### 개요
- Cloudflare의 정적 사이트 호스팅 서비스
- Vercel/Netlify와 유사한 JAMstack 플랫폼
- Git 연동 자동 배포

#### 장점
1. **관리 편의성**
   - Git push만으로 자동 배포
   - 프리뷰 환경 자동 생성
   - 무료 HTTPS, CDN 자동 적용

2. **성능**
   - 전 세계 CDN 엣지 배포
   - 빠른 콘텐츠 로딩
   - 자동 캐싱 최적화

3. **비용**
   - 무료 플랜으로 충분 (500 빌드/월)
   - 무제한 요청
   - 무제한 대역폭

4. **개발자 경험**
   - CI/CD 자동화
   - 브랜치별 프리뷰
   - 롤백 간편

#### 단점
1. **정적 빌드만 지원**
   - Next.js SSR/ISR 제한적
   - API Routes는 Cloudflare Workers로 변환 필요
   - 서버 사이드 기능 제약

2. **DB 연결 복잡**
   - **ws-248-247 PostgreSQL 직접 연결 불가**
   - Cloudflare Workers → Tunnel → PostgreSQL 필요
   - 추가 레이턴시 발생

3. **NextAuth 호환성**
   - 세션 관리 복잡
   - DB adapter 사용 어려움
   - Edge runtime 제약

#### 아키텍처
```
[사용자]
   ↓ HTTPS
[Cloudflare Pages CDN] (정적 파일)
   ↓ API 요청
[Cloudflare Workers] (API Routes 변환)
   ↓ Tunnel
[ws-248-247 서버]
   └─ PostgreSQL :5432
```

#### 적합성
❌ **부적합**
- CareMatch V3는 SSR, API Routes, NextAuth 세션, DB 직접 연결 필요
- Pages는 정적 빌드 중심이라 기능 제약 많음

---

### 옵션 2: Cloudflare Tunnel (직접 연결)

#### 개요
- ws-248-247 서버에서 실행 중인 Docker 컨테이너를 외부에 노출
- Cloudflare가 리버스 프록시 역할
- 서버 방화벽 개방 없이 안전한 연결

#### 장점
1. **완전한 제어**
   - Next.js 모든 기능 사용 가능 (SSR, ISR, API Routes)
   - NextAuth DB 세션 완벽 지원
   - PostgreSQL 직접 연결 (host.docker.internal)

2. **보안**
   - 서버 포트 외부 개방 불필요
   - Cloudflare가 DDoS 보호
   - 암호화된 터널 연결

3. **단순한 아키텍처**
   - 추가 Workers/Functions 불필요
   - DB 직접 연결로 빠른 응답
   - 기존 Docker 환경 그대로 사용

4. **비용**
   - Cloudflare Tunnel 무료
   - 대역폭 무제한
   - 추가 서비스 불필요

#### 단점
1. **서버 의존성**
   - ws-248-247 서버 다운 시 서비스 중단
   - 서버 리소스 소모 (CPU, 메모리)

2. **글로벌 CDN 제한**
   - 정적 파일도 ws-248-247에서 서빙
   - 해외 사용자 접속 시 레이턴시
   - (하지만 한국 사용자 대상이므로 큰 문제 없음)

3. **스케일링 제약**
   - 수평 확장 어려움
   - 트래픽 증가 시 서버 업그레이드 필요

#### 아키텍처
```
[사용자]
   ↓ HTTPS
[Cloudflare Tunnel] care.abada.kr
   ↓ 암호화 터널
[ws-248-247 서버]
   ├─ Docker: care_frontend :9000 (Next.js)
   ├─ Docker: care_redis :6379
   └─ PostgreSQL :5432 (시스템 설치)
```

#### 적합성
✅ **적합**
- CareMatch V3의 모든 요구사항 충족
- DB 직접 연결 가능
- NextAuth 세션 관리 문제 없음
- 기존 인프라 활용

---

## 🎯 권장 배포 방식

### 결론: **Cloudflare Tunnel (직접 연결)** 채택

#### 이유

1. **기술 스택 호환성**
   - Next.js 15 Pages Router 완벽 지원
   - NextAuth.js DB 세션 사용 가능
   - API Routes 제약 없음

2. **DB 연결 단순성**
   - PostgreSQL 직접 연결 (host.docker.internal:5432)
   - 추가 프록시/Workers 불필요
   - 낮은 레이턴시

3. **기존 인프라 활용**
   - ws.abada.co.kr과 동일한 배포 방식
   - 검증된 구성
   - 운영 노하우 재사용

4. **대상 사용자**
   - 50-70세 한국 고령층 (국내 서비스)
   - 글로벌 CDN 불필요
   - 한국 서버로 충분한 응답 속도

#### 구현 방법

```yaml
# Cloudflare Tunnel 설정
ingress:
  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      noTLSVerify: true
```

**DNS 설정**:
- Type: CNAME
- Name: care
- Target: <tunnel-id>.cfargotunnel.com
- Proxy: ✅ Proxied

---

## 📊 비교표

| 항목 | Cloudflare Pages | Cloudflare Tunnel |
|------|-----------------|-------------------|
| **Next.js SSR** | ⚠️ 제한적 | ✅ 완전 지원 |
| **API Routes** | ⚠️ Workers 변환 | ✅ 완전 지원 |
| **NextAuth** | ⚠️ 복잡 | ✅ 완전 지원 |
| **DB 연결** | ❌ 직접 불가 | ✅ 직접 연결 |
| **배포 속도** | ✅ 빠름 (Git push) | 🟡 수동/스크립트 |
| **글로벌 CDN** | ✅ 우수 | 🟡 단일 서버 |
| **비용** | ✅ 무료 | ✅ 무료 |
| **보안** | ✅ 우수 | ✅ 우수 |
| **관리 편의성** | ✅ 우수 | 🟡 보통 |
| **서버 의존성** | ✅ 없음 | ❌ 있음 |
| **CareMatch 적합성** | ❌ 부적합 | ✅ 적합 |

---

## 🔄 향후 마이그레이션 시나리오 (선택)

트래픽이 급증하거나 글로벌 확장 시 고려할 수 있는 방안:

### 하이브리드 방식 (Cloudflare Pages + Workers + Tunnel)

```
[정적 파일] → Cloudflare Pages (CDN)
[API Routes] → Cloudflare Workers
   ↓ Tunnel
[ws-248-247] PostgreSQL
```

**장점**:
- 정적 파일은 CDN으로 빠르게
- API는 Workers로 처리
- DB는 기존 서버 유지

**단점**:
- 복잡한 구성
- NextAuth 세션 관리 어려움
- 개발/운영 난이도 증가

**채택 시기**:
- 동시 접속자 1,000명 이상
- 해외 사용자 비율 30% 이상
- 서버 리소스 한계 도달 시

---

## ✅ 최종 배포 사양

### 포트 설정
```yaml
# docker-compose.care.yml
services:
  frontend:
    ports:
      - "9000:3000"  # 외부:내부

  redis:
    # 내부 전용, 포트 노출 안 함
```

### Cloudflare Tunnel
```yaml
# /etc/cloudflared/config.yml
ingress:
  # 기존 서비스들...

  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
```

### DNS 레코드
```
Type: CNAME
Name: care
Content: <tunnel-id>.cfargotunnel.com
Proxy: Proxied (Orange Cloud)
TTL: Auto
```

---

## 📝 배포 체크리스트

### 포트 설정
- [x] 포트 9000 사용 (충돌 없음 확인)
- [x] Docker Compose 포트 매핑: 9000:3000
- [x] 컨테이너명: care_frontend, care_redis

### Cloudflare 설정
- [x] 배포 방식: Cloudflare Tunnel 선택
- [ ] Tunnel 생성: care-abada-kr
- [ ] DNS 레코드 추가: care.abada.kr
- [ ] Tunnel config 업데이트

### DB 연결
- [ ] PostgreSQL DB 생성: carematch_v3
- [ ] DATABASE_URL: host.docker.internal:5432

---

## 🚀 다음 단계

1. **DEPLOY-PLAN.md 업데이트**
   - 포트 9000 확정
   - Cloudflare Pages 제거
   - Tunnel 배포만 진행

2. **Phase 1 시작**
   - DB 마이그레이션 준비
   - Supabase → PostgreSQL 변환

3. **Phase 2-4 진행**
   - Docker 설정
   - 서버 배포

4. **Phase 5 진행**
   - Cloudflare Tunnel 설정
   - DNS 연결

---

*작성일: 2026-02-03*
*작성자: Claude Code*
*결정: Cloudflare Tunnel 직접 연결 방식 채택*
