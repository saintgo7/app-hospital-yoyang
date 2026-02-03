# Cloudflare Tunnel 설정 가이드

> **대상**: care.abada.kr  
> **서버**: ws-248-247  
> **포트**: 9000  
> **작성일**: 2026-02-04

---

## 📋 개요

Cloudflare Tunnel을 사용하여 ws-248-247 서버의 포트 9000을 care.abada.kr 도메인으로 연결합니다.

### 장점
- 무료 SSL/TLS 인증서
- DDoS 보호
- 암호화된 터널
- 포트 포워딩 불필요
- 방화벽 설정 불필요

---

## 🚀 Step 1: 기존 Tunnel 확인

ws-248-247 서버에는 이미 Cloudflare Tunnel이 설치되어 있습니다.

```bash
# SSH 접속
ssh ws-248-247

# Tunnel 서비스 상태 확인
sudo systemctl status cloudflared

# Tunnel 목록 확인
cloudflared tunnel list

# 설정 파일 위치 확인
cat /etc/cloudflared/config.yml
# 또는
cat ~/.cloudflared/config.yml
```

**예상 출력**:
```
● cloudflared.service - Cloudflare Tunnel
   Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
   Active: active (running) since ...
```

---

## 🔧 Step 2: Tunnel 설정 업데이트

### 2-1. 설정 파일 편집

```bash
# 설정 파일 편집 (root 권한 필요)
sudo vi /etc/cloudflared/config.yml
```

### 2-2. care.abada.kr 추가

**기존 설정 예시**:
```yaml
tunnel: 12345678-90ab-cdef-1234-567890abcdef
credentials-file: /root/.cloudflared/12345678-90ab-cdef-1234-567890abcdef.json

ingress:
  - hostname: ws.abada.kr
    service: http://localhost:8000

  - hostname: fire.abada.kr
    service: http://localhost:3000

  - hostname: sikyak.abada.kr
    service: http://localhost:5000

  - service: http_status:404
```

**업데이트된 설정** (care.abada.kr 추가):
```yaml
tunnel: 12345678-90ab-cdef-1234-567890abcdef
credentials-file: /root/.cloudflared/12345678-90ab-cdef-1234-567890abcdef.json

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

  # Catch-all (항상 마지막에 위치)
  - service: http_status:404
```

### 2-3. originRequest 옵션 설명

| 옵션 | 값 | 설명 |
|------|-----|------|
| `noTLSVerify` | `true` | Self-signed 인증서 허용 |
| `connectTimeout` | `30s` | 연결 타임아웃 |
| `tlsTimeout` | `10s` | TLS 핸드셰이크 타임아웃 |
| `keepAliveTimeout` | `90s` | Keep-alive 타임아웃 |
| `keepAliveConnections` | `100` | Keep-alive 연결 수 |

---

## ✅ Step 3: 설정 검증

### 3-1. 설정 파일 문법 검사

```bash
# 설정 파일 유효성 검사
cloudflared tunnel ingress validate
```

**성공 출력**:
```
Validating rules from /etc/cloudflared/config.yml
OK
```

**실패 시**:
```
Validating rules from /etc/cloudflared/config.yml
ERROR: invalid ingress rules: ...
```
→ config.yml 문법 오류를 수정하세요.

### 3-2. Ingress 규칙 테스트

```bash
# care.abada.kr에 대한 라우팅 규칙 테스트
cloudflared tunnel ingress rule https://care.abada.kr
```

**예상 출력**:
```
Using rules from /etc/cloudflared/config.yml
Matched rule #4
  hostname: care.abada.kr
  service: http://localhost:9000
```

---

## 🔄 Step 4: Tunnel 재시작

### 4-1. systemd 서비스 재시작

```bash
# Tunnel 재시작
sudo systemctl restart cloudflared

# 상태 확인
sudo systemctl status cloudflared
```

**성공 출력**:
```
● cloudflared.service - Cloudflare Tunnel
   Active: active (running) since Tue 2026-02-04 12:00:00 KST; 5s ago
```

### 4-2. 로그 확인

```bash
# 로그 실시간 모니터링
sudo journalctl -u cloudflared -f

# 최근 100줄 로그
sudo journalctl -u cloudflared -n 100
```

**정상 출력**:
```
INFO Registered tunnel connection ...
INFO Connection registered ...
```

**에러 발생 시**:
```
ERR  error="Unable to reach the origin service" ...
```
→ localhost:9000이 실행 중인지 확인하세요.

---

## 🌐 Step 5: DNS 레코드 추가

### 5-1. Cloudflare Dashboard 접속

1. https://dash.cloudflare.com 로그인
2. **abada.kr** 도메인 선택
3. **DNS** 탭 클릭

### 5-2. CNAME 레코드 추가

**클릭 순서**:
1. **Add record** 버튼 클릭
2. 다음 정보 입력:

| 필드 | 값 |
|------|-----|
| Type | CNAME |
| Name | care |
| Target | `<tunnel-id>.cfargotunnel.com` |
| Proxy status | ✅ Proxied (오렌지 클라우드) |
| TTL | Auto |

**Tunnel ID 확인 방법**:
```bash
# 서버에서 실행
cloudflared tunnel list
```

**예시**:
```
ID: 12345678-90ab-cdef-1234-567890abcdef
NAME: ws-248-tunnel
CREATED: 2024-01-15
```

**Target 예시**: `12345678-90ab-cdef-1234-567890abcdef.cfargotunnel.com`

### 5-3. DNS 전파 확인

```bash
# DNS 조회 (로컬 머신에서)
nslookup care.abada.kr

# dig 사용 (상세 정보)
dig care.abada.kr
```

**예상 출력**:
```
care.abada.kr canonical name = 12345678-90ab-cdef-1234-567890abcdef.cfargotunnel.com
```

DNS 전파는 보통 1-5분 소요됩니다.

---

## 🧪 Step 6: 연결 테스트

### 6-1. 로컬 테스트 (서버에서)

```bash
# localhost:9000 테스트
curl http://localhost:9000

# Health Check
curl http://localhost:9000/api/health
```

**성공 출력**:
```json
{
  "status": "healthy",
  "database": "connected",
  "uptime": 123.45
}
```

### 6-2. Tunnel을 통한 테스트 (서버에서)

```bash
# Tunnel을 통한 접속
curl https://care.abada.kr

# Health Check
curl https://care.abada.kr/api/health
```

### 6-3. 외부 테스트 (로컬 머신에서)

```bash
# 브라우저 또는 curl
curl https://care.abada.kr

# Health Check
curl https://care.abada.kr/api/health
```

---

## 🛠️ 고급 설정 (선택)

### HTTP/2 활성화

```yaml
ingress:
  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      http2Origin: true  # HTTP/2 활성화
```

### 요청 헤더 추가

```yaml
ingress:
  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      httpHostHeader: care.abada.kr
```

### 압축 비활성화

```yaml
ingress:
  - hostname: care.abada.kr
    service: http://localhost:9000
    originRequest:
      disableChunkedEncoding: true
```

---

## 🔐 Cloudflare Access (선택사항)

특정 사용자만 접근 허용하려면:

1. Cloudflare Dashboard > Zero Trust > Access
2. **Add an application** 클릭
3. **Self-hosted** 선택
4. **Application name**: CareMatch V3
5. **Domain**: care.abada.kr
6. **Policy**: 접근 규칙 설정 (IP, Email 등)

---

## 🐛 문제 해결

### 문제 1: Tunnel 연결 안됨

**증상**:
```
ERR error="Unable to reach the origin service"
```

**해결**:
```bash
# 1. localhost:9000 확인
curl http://localhost:9000

# 2. 방화벽 확인 (필요 없음)
# Tunnel은 outbound 연결만 사용

# 3. Tunnel 재시작
sudo systemctl restart cloudflared
```

### 문제 2: DNS 레코드 인식 안됨

**증상**: care.abada.kr 접속 불가

**해결**:
```bash
# DNS 전파 확인
dig care.abada.kr

# Cloudflare Dashboard에서 확인:
# - CNAME 레코드가 Proxied (오렌지)인지 확인
# - Target이 올바른 Tunnel ID인지 확인
```

### 문제 3: 502 Bad Gateway

**증상**: care.abada.kr 접속 시 502 에러

**해결**:
```bash
# 1. 컨테이너 확인
docker compose -f docker-compose.care.yml ps

# 2. Health Check 확인
curl http://localhost:9000/api/health

# 3. 컨테이너 재시작
docker compose -f docker-compose.care.yml restart
```

### 문제 4: SSL 인증서 에러

**증상**: SSL certificate problem

**해결**:
- Cloudflare Dashboard > SSL/TLS > Overview
- **Encryption mode**: Full (strict) 또는 Full
- **Always Use HTTPS**: On

---

## 📊 모니터링

### Tunnel 로그 모니터링

```bash
# 실시간 로그
sudo journalctl -u cloudflared -f

# 에러만 필터링
sudo journalctl -u cloudflared | grep ERR

# 특정 시간 로그
sudo journalctl -u cloudflared --since "1 hour ago"
```

### Cloudflare Analytics

1. Cloudflare Dashboard 로그인
2. **abada.kr** 도메인 선택
3. **Analytics & Logs** 탭
4. **Traffic** 확인

---

## ✅ 체크리스트

### Tunnel 설정
- [ ] config.yml에 care.abada.kr 추가
- [ ] originRequest 옵션 설정
- [ ] `cloudflared tunnel ingress validate` 통과
- [ ] Tunnel 재시작 완료
- [ ] 로그에 에러 없음

### DNS 설정
- [ ] CNAME 레코드 추가 (care → tunnel-id.cfargotunnel.com)
- [ ] Proxy status: Proxied (오렌지)
- [ ] DNS 전파 확인

### 연결 테스트
- [ ] localhost:9000 응답 확인
- [ ] https://care.abada.kr 응답 확인
- [ ] Health Check API 동작 확인
- [ ] 브라우저에서 정상 로드 확인

---

**작성일**: 2026-02-04  
**버전**: 1.0  
**담당**: Ph.D SNT Go.
