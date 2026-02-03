#!/bin/bash

# ============================================
# CareMatch V3 Server Deployment Script
# Target: ws-248-247 서버
# ============================================

set -e

echo "🚀 CareMatch V3 서버 배포 스크립트"
echo "=================================="
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 변수
DEPLOY_DIR="/data/blackpc/app-care/carematch-v3"
DB_NAME="carematch_v3"
COMPOSE_FILE="docker-compose.care.yml"

# ===================================
# Phase 1: 사전 확인
# ===================================

echo -e "${BLUE}[1/7] 사전 확인${NC}"
echo "--------------------------------"

# 현재 디렉토리 확인
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}✗ docker-compose.care.yml 파일이 없습니다.${NC}"
    echo "현재 디렉토리: $(pwd)"
    exit 1
fi

echo -e "${GREEN}✓ docker-compose.care.yml 확인${NC}"

# .env.production 파일 확인
if [ ! -f ".env.production" ]; then
    echo -e "${RED}✗ .env.production 파일이 없습니다.${NC}"
    echo ""
    echo "다음 명령으로 생성하세요:"
    echo "  cp .env.example .env.production"
    echo "  vi .env.production  # 환경 변수 설정"
    exit 1
fi

echo -e "${GREEN}✓ .env.production 확인${NC}"

# PostgreSQL 확인
if ! command -v psql &> /dev/null; then
    echo -e "${RED}✗ PostgreSQL이 설치되지 않았습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL 설치됨${NC}"

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker가 설치되지 않았습니다.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 설치됨${NC}"

echo ""

# ===================================
# Phase 2: PostgreSQL 데이터베이스 확인
# ===================================

echo -e "${BLUE}[2/7] PostgreSQL 데이터베이스 확인${NC}"
echo "--------------------------------"

# 데이터베이스 존재 확인
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo -e "${YELLOW}⚠ 데이터베이스 '$DB_NAME'가 이미 존재합니다.${NC}"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "배포 취소됨"
        exit 1
    fi
else
    echo -e "${YELLOW}📦 데이터베이스 생성 중...${NC}"
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO postgres;"
    echo -e "${GREEN}✓ 데이터베이스 생성 완료${NC}"
fi

echo ""

# ===================================
# Phase 3: DB 마이그레이션 실행
# ===================================

echo -e "${BLUE}[3/7] DB 마이그레이션 실행${NC}"
echo "--------------------------------"

if [ -f "migrations/postgres/01_initial_schema.sql" ]; then
    echo -e "${YELLOW}🔄 스키마 마이그레이션 실행 중...${NC}"
    sudo -u postgres psql "$DB_NAME" < migrations/postgres/01_initial_schema.sql 2>&1 | grep -v "NOTICE" || true
    echo -e "${GREEN}✓ 스키마 마이그레이션 완료${NC}"
else
    echo -e "${RED}✗ migrations/postgres/01_initial_schema.sql 파일이 없습니다.${NC}"
    exit 1
fi

# Seed 데이터 (선택)
if [ -f "migrations/postgres/02_seed_data.sql" ]; then
    read -p "초기 데이터를 삽입하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🌱 초기 데이터 삽입 중...${NC}"
        sudo -u postgres psql "$DB_NAME" < migrations/postgres/02_seed_data.sql 2>&1 | grep -v "NOTICE" || true
        echo -e "${GREEN}✓ 초기 데이터 삽입 완료${NC}"
    fi
fi

echo ""

# ===================================
# Phase 4: 기존 컨테이너 중지
# ===================================

echo -e "${BLUE}[4/7] 기존 컨테이너 중지${NC}"
echo "--------------------------------"

if docker compose -f "$COMPOSE_FILE" ps | grep -q "care_"; then
    echo -e "${YELLOW}🛑 기존 컨테이너 중지 중...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    echo -e "${GREEN}✓ 컨테이너 중지 완료${NC}"
else
    echo -e "${GREEN}✓ 실행 중인 컨테이너 없음${NC}"
fi

echo ""

# ===================================
# Phase 5: Docker 이미지 빌드
# ===================================

echo -e "${BLUE}[5/7] Docker 이미지 빌드${NC}"
echo "--------------------------------"

echo -e "${YELLOW}🔨 이미지 빌드 중... (3-5분 소요)${NC}"
docker compose -f "$COMPOSE_FILE" build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 이미지 빌드 성공${NC}"
else
    echo -e "${RED}✗ 이미지 빌드 실패${NC}"
    exit 1
fi

echo ""

# ===================================
# Phase 6: 컨테이너 시작
# ===================================

echo -e "${BLUE}[6/7] 컨테이너 시작${NC}"
echo "--------------------------------"

echo -e "${YELLOW}🚀 컨테이너 시작 중...${NC}"
docker compose -f "$COMPOSE_FILE" --env-file .env.production up -d

# 컨테이너 시작 대기
echo "⏳ 애플리케이션 초기화 대기 (40초)..."
sleep 40

echo ""

# ===================================
# Phase 7: Health Check
# ===================================

echo -e "${BLUE}[7/7] Health Check${NC}"
echo "--------------------------------"

echo -e "${YELLOW}🏥 Health Check 실행 중...${NC}"

# localhost:9000 체크
if curl -sf http://localhost:9000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Health Check 성공 (http://localhost:9000)${NC}"
else
    echo -e "${RED}✗ Health Check 실패${NC}"
    echo ""
    echo "로그 확인:"
    docker compose -f "$COMPOSE_FILE" logs --tail 50 frontend
    exit 1
fi

echo ""

# ===================================
# 배포 완료
# ===================================

echo "==========================================="
echo -e "${GREEN}✅ 배포 완료!${NC}"
echo "==========================================="
echo ""

echo "📊 컨테이너 상태:"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo "🌐 접속 정보:"
echo "  - 로컬: http://localhost:9000"
echo "  - Health Check: http://localhost:9000/api/health"
echo ""
echo "📋 유용한 명령어:"
echo "  - 로그 확인: docker compose -f $COMPOSE_FILE logs -f"
echo "  - 재시작: docker compose -f $COMPOSE_FILE restart"
echo "  - 중지: docker compose -f $COMPOSE_FILE down"
echo ""
echo "🔄 다음 단계:"
echo "  1. Cloudflare Tunnel 설정 (config.yml 업데이트)"
echo "  2. DNS 레코드 추가 (care.abada.kr)"
echo "  3. Tunnel 재시작: sudo systemctl restart cloudflared"
echo "  4. 외부 접속 테스트: https://care.abada.kr"
echo ""
