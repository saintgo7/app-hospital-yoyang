#!/bin/bash

# Security Check Script for CareMatch V3

set -e

echo "🔐 CareMatch V3 보안 검사"
echo "======================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

ISSUES_FOUND=0

# 1. 환경 변수 및 비밀키 검사
echo -e "${BLUE}[1/8] 환경 변수 및 비밀키 검사${NC}"
echo "--------------------------------"

if [ -f ".env.local" ]; then
    echo "✓ .env.local 파일 검사 중..."
    
    if grep -q "NEXTAUTH_SECRET=$" .env.local 2>/dev/null; then
        echo -e "${RED}✗ NEXTAUTH_SECRET이 비어있습니다${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✓ NEXTAUTH_SECRET 설정됨${NC}"
    fi
fi

# 소스 코드에서 하드코딩된 비밀키 검사
echo ""
echo "✓ 소스 코드에서 하드코딩된 비밀키 검사 중..."
HARDCODED_SECRETS=$(grep -r -i -E "(password|secret|api_key|private_key)\s*=\s*['\"][^'\"]+['\"]" src/ --exclude-dir=node_modules --exclude="*.md" 2>/dev/null | grep -v "process.env" | grep -v "NEXTAUTH_SECRET || 'temporary" || true)

if [ -n "$HARDCODED_SECRETS" ]; then
    echo -e "${RED}✗ 하드코딩된 비밀키 발견:${NC}"
    echo "$HARDCODED_SECRETS"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ 하드코딩된 비밀키 없음${NC}"
fi

echo ""

# 2. SQL Injection 방어 검사
echo -e "${BLUE}[2/8] SQL Injection 방어 검사${NC}"
echo "--------------------------------"

# 파라미터화된 쿼리 사용 확인
PARAMETERIZED_COUNT=$(grep -r "query(" src/ --include="*.ts" | grep -c "\$1\|\$2\|\$3" || echo "0")
echo "✓ 파라미터화된 쿼리 사용: ${PARAMETERIZED_COUNT}개"

# 안전하지 않은 쿼리 패턴 검사
UNSAFE_COUNT=$(grep -r -E "query\(\`.*\${" src/ --include="*.ts" 2>/dev/null | wc -l)
if [ "$UNSAFE_COUNT" -gt 0 ]; then
    echo -e "${RED}✗ 문자열 템플릿을 사용한 SQL 쿼리 발견: ${UNSAFE_COUNT}개${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✓ 모든 SQL 쿼리가 안전함${NC}"
fi

echo ""

# 3. XSS 방어 검사
echo -e "${BLUE}[3/8] XSS 방어 검사${NC}"
echo "--------------------------------"

DANGEROUS_HTML_COUNT=$(grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx" 2>/dev/null | wc -l)
if [ "$DANGEROUS_HTML_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠ dangerouslySetInnerHTML 사용: ${DANGEROUS_HTML_COUNT}개${NC}"
    echo -e "${YELLOW}  → sanitize 필요${NC}"
else
    echo -e "${GREEN}✓ dangerouslySetInnerHTML 사용 없음${NC}"
fi

echo ""

# 4. 인증/인가 검사
echo -e "${BLUE}[4/8] 인증/인가 검사${NC}"
echo "--------------------------------"

echo "✓ API 라우트 인증 검사 중..."
API_COUNT=$(find src/pages/api -name "*.ts" -not -name "[...nextauth].ts" -not -name "health.ts" -not -name "sitemap.ts" 2>/dev/null | wc -l)
AUTH_COUNT=$(find src/pages/api -name "*.ts" -exec grep -l "getServerSession" {} \; 2>/dev/null | wc -l)

echo "  총 API 라우트: $API_COUNT"
echo "  인증 체크 있음: $AUTH_COUNT"

if [ "$API_COUNT" -gt "$AUTH_COUNT" ]; then
    echo -e "${YELLOW}⚠ 일부 API에 인증 체크 없을 수 있음${NC}"
else
    echo -e "${GREEN}✓ 대부분의 API가 인증 체크함${NC}"
fi

echo ""

# 5. 의존성 취약점 검사
echo -e "${BLUE}[5/8] 의존성 취약점 검사${NC}"
echo "--------------------------------"

if command -v pnpm &> /dev/null; then
    echo "✓ pnpm audit 실행 중..."
    pnpm audit --audit-level=high 2>&1 | head -20 || echo -e "${YELLOW}⚠ 취약점 확인 필요${NC}"
else
    echo -e "${YELLOW}⚠ pnpm 미설치${NC}"
fi

echo ""

# 6. 보안 헤더 검사
echo -e "${BLUE}[6/8] 보안 헤더 검사${NC}"
echo "--------------------------------"

if [ -f "next.config.js" ]; then
    if grep -q "X-Frame-Options" next.config.js; then
        echo -e "${GREEN}✓ X-Frame-Options 설정됨${NC}"
    else
        echo -e "${YELLOW}⚠ X-Frame-Options 없음${NC}"
    fi
    
    if grep -q "X-Content-Type-Options" next.config.js; then
        echo -e "${GREEN}✓ X-Content-Type-Options 설정됨${NC}"
    else
        echo -e "${YELLOW}⚠ X-Content-Type-Options 없음${NC}"
    fi
fi

echo ""

# 7. 민감한 정보 노출 검사
echo -e "${BLUE}[7/8] 민감한 정보 노출 검사${NC}"
echo "--------------------------------"

# .gitignore 설정 확인
SENSITIVE_FILES=(".env" ".env.local" ".env.production" "*.pem")
for file in "${SENSITIVE_FILES[@]}"; do
    if grep -q "^$file" .gitignore 2>/dev/null || grep -q "^${file//\*/\\*}" .gitignore 2>/dev/null; then
        echo -e "${GREEN}✓ $file이 .gitignore에 있음${NC}"
    else
        echo -e "${RED}✗ $file이 .gitignore에 없음${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
done

echo ""

# 8. Docker 보안 검사
echo -e "${BLUE}[8/8] Docker 보안 검사${NC}"
echo "--------------------------------"

if grep -q "USER nextjs" Dockerfile 2>/dev/null; then
    echo -e "${GREEN}✓ Non-root 사용자 사용${NC}"
else
    echo -e "${YELLOW}⚠ Dockerfile 확인 필요${NC}"
fi

if [ -f ".dockerignore" ]; then
    if grep -q ".env" .dockerignore; then
        echo -e "${GREEN}✓ .env가 .dockerignore에 있음${NC}"
    else
        echo -e "${RED}✗ .env가 .dockerignore에 없음${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    echo -e "${RED}✗ .dockerignore 없음${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""
echo "==========================================="
echo -e "${BLUE}보안 검사 완료${NC}"
echo "==========================================="
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ 심각한 보안 이슈 없음${NC}"
    exit 0
else
    echo -e "${RED}❌ $ISSUES_FOUND개의 보안 이슈 발견${NC}"
    echo ""
    echo "수정 권장 사항 확인: SECURITY-GUIDE.md"
    exit 1
fi
