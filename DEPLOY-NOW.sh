#!/bin/bash

# ===================================
# CareMatch V3 서버 배포 실행 스크립트
# ===================================
# 이 스크립트를 ws-248-247 서버에서 실행하세요.
# ===================================

set -e

echo "========================================"
echo "CareMatch V3 서버 배포 시작"
echo "========================================"
echo ""

# 색상
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 변수
REPO_URL="https://github.com/saintgo7/app-hospital-yoyang.git"
DEPLOY_DIR="/data/blackpc/app-care/carematch-v3"

# ===================================
# Step 1: 배포 디렉토리 생성
# ===================================

echo -e "${BLUE}[Step 1/6] 배포 디렉토리 생성${NC}"
echo "--------------------------------"

if [ ! -d "$DEPLOY_DIR" ]; then
    echo -e "${YELLOW}📁 디렉토리 생성 중...${NC}"
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown -R $USER:$USER "$DEPLOY_DIR"
    echo -e "${GREEN}✓ 디렉토리 생성 완료${NC}"
else
    echo -e "${GREEN}✓ 디렉토리 이미 존재${NC}"
fi

cd "$DEPLOY_DIR"
echo -e "${GREEN}✓ 작업 디렉토리: $DEPLOY_DIR${NC}"
echo ""

# ===================================
# Step 2: 코드 가져오기
# ===================================

echo -e "${BLUE}[Step 2/6] 코드 배포${NC}"
echo "--------------------------------"

if [ -d ".git" ]; then
    echo -e "${YELLOW}🔄 기존 코드 업데이트 중...${NC}"
    git pull origin main
    echo -e "${GREEN}✓ 코드 업데이트 완료${NC}"
else
    echo -e "${YELLOW}📦 Git clone 중...${NC}"
    git clone "$REPO_URL" .
    echo -e "${GREEN}✓ Git clone 완료${NC}"
fi

echo ""

# ===================================
# Step 3: 환경 변수 설정
# ===================================

echo -e "${BLUE}[Step 3/6] 환경 변수 설정${NC}"
echo "--------------------------------"

if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠ .env.production 파일이 없습니다.${NC}"
    echo ""
    echo "다음 명령으로 생성하세요:"
    echo "  cp .env.example .env.production"
    echo "  vi .env.production"
    echo ""
    echo "필수 환경 변수:"
    echo "  - DATABASE_URL (PostgreSQL 연결 문자열)"
    echo "  - NEXTAUTH_SECRET (openssl rand -base64 32)"
    echo "  - KAKAO_CLIENT_ID / KAKAO_CLIENT_SECRET"
    echo "  - NAVER_CLIENT_ID / NAVER_CLIENT_SECRET"
    echo ""
    
    read -p ".env.production 파일을 지금 생성하시겠습니까? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cp .env.example .env.production
        echo -e "${YELLOW}📝 .env.production 편집기 열기...${NC}"
        vi .env.production
        echo -e "${GREEN}✓ .env.production 설정 완료${NC}"
    else
        echo -e "${RED}✗ .env.production 파일이 필요합니다. 수동으로 생성 후 다시 실행하세요.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ .env.production 확인됨${NC}"
fi

echo ""

# ===================================
# Step 4: 배포 스크립트 실행
# ===================================

echo -e "${BLUE}[Step 4/6] 배포 실행${NC}"
echo "--------------------------------"

if [ -f "scripts/docker-deploy.sh" ]; then
    echo -e "${YELLOW}🚀 배포 스크립트 실행 중...${NC}"
    ./scripts/docker-deploy.sh
else
    echo -e "${RED}✗ scripts/docker-deploy.sh 파일이 없습니다.${NC}"
    exit 1
fi

echo ""

# ===================================
# Step 5: Cloudflare Tunnel 설정 안내
# ===================================

echo -e "${BLUE}[Step 5/6] Cloudflare Tunnel 설정${NC}"
echo "--------------------------------"

echo "다음 명령으로 Cloudflare Tunnel을 설정하세요:"
echo ""
echo "1. config.yml 편집:"
echo "   sudo vi /etc/cloudflared/config.yml"
echo ""
echo "2. care.abada.kr ingress 추가:"
echo "   - hostname: care.abada.kr"
echo "     service: http://localhost:9000"
echo ""
echo "3. 설정 검증:"
echo "   cloudflared tunnel ingress validate"
echo ""
echo "4. Tunnel 재시작:"
echo "   sudo systemctl restart cloudflared"
echo ""

read -p "Cloudflare Tunnel 설정을 진행하시겠습니까? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}📝 config.yml 편집기 열기...${NC}"
    sudo vi /etc/cloudflared/config.yml
    
    echo -e "${YELLOW}✓ 설정 검증 중...${NC}"
    cloudflared tunnel ingress validate
    
    echo -e "${YELLOW}🔄 Tunnel 재시작 중...${NC}"
    sudo systemctl restart cloudflared
    
    echo -e "${GREEN}✓ Cloudflare Tunnel 설정 완료${NC}"
else
    echo -e "${YELLOW}⚠ Cloudflare Tunnel 설정을 건너뜁니다.${NC}"
    echo "나중에 CLOUDFLARE-TUNNEL-GUIDE.md를 참고하여 설정하세요."
fi

echo ""

# ===================================
# Step 6: 배포 검증
# ===================================

echo -e "${BLUE}[Step 6/6] 배포 검증${NC}"
echo "--------------------------------"

echo "로컬 접속 테스트:"
curl -s http://localhost:9000/api/health | jq . || echo "Health check API 응답 없음"

echo ""
echo "========================================"
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo "========================================"
echo ""
echo "🌐 다음 단계:"
echo "1. Cloudflare Dashboard에서 DNS 레코드 추가:"
echo "   - Type: CNAME"
echo "   - Name: care"
echo "   - Target: <tunnel-id>.cfargotunnel.com"
echo "   - Proxy: Proxied (오렌지)"
echo ""
echo "2. 외부 접속 테스트:"
echo "   curl https://care.abada.kr/api/health"
echo ""
echo "3. 브라우저에서 확인:"
echo "   https://care.abada.kr"
echo ""
echo "📚 참고 문서:"
echo "   - SERVER-DEPLOY-GUIDE.md"
echo "   - CLOUDFLARE-TUNNEL-GUIDE.md"
echo "   - DEPLOYMENT-CHECKLIST.md"
echo ""
