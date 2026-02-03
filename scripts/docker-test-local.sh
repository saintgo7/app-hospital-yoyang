#!/bin/bash

# ============================================
# Docker Local Test Script for CareMatch V3
# ============================================

set -e

echo "🧪 CareMatch V3 Docker 로컬 테스트"
echo "================================"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 환경 변수 파일 확인
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local 파일이 없습니다.${NC}"
    echo "먼저 .env.local 파일을 생성해주세요:"
    echo "  cp .env.example .env.local"
    echo "  vi .env.local  # 환경 변수 설정"
    exit 1
fi

echo -e "${GREEN}✓ .env.local 파일 확인${NC}"

# Docker 이미지 확인
IMAGE_NAME="carematch-v3:latest"
if ! docker images | grep -q "carematch-v3"; then
    echo -e "${RED}❌ Docker 이미지가 없습니다.${NC}"
    echo "먼저 빌드를 실행해주세요:"
    echo "  ./scripts/docker-build.sh"
    exit 1
fi

echo -e "${GREEN}✓ Docker 이미지 확인${NC}"

# 기존 컨테이너 정리
echo ""
echo -e "${YELLOW}🧹 기존 테스트 컨테이너 정리...${NC}"
docker rm -f care_test_redis care_test_frontend 2>/dev/null || true

# PostgreSQL 연결 확인
echo ""
echo -e "${YELLOW}🔍 PostgreSQL 연결 확인...${NC}"
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL이 실행되지 않았습니다.${NC}"
    echo "PostgreSQL을 실행해주세요."
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL 실행 중${NC}"

# Redis 컨테이너 실행
echo ""
echo -e "${YELLOW}🚀 Redis 컨테이너 시작...${NC}"
docker run -d \
    --name care_test_redis \
    --network host \
    redis:7-alpine \
    redis-server --appendonly yes

# Redis 준비 대기
echo "⏳ Redis 초기화 대기..."
sleep 3

# Next.js 컨테이너 실행
echo ""
echo -e "${YELLOW}🚀 Next.js 컨테이너 시작...${NC}"
docker run -d \
    --name care_test_frontend \
    --network host \
    --env-file .env.local \
    -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/carematch_v3" \
    -e REDIS_URL="redis://localhost:6379/0" \
    -e NEXTAUTH_URL="http://localhost:9000" \
    ${IMAGE_NAME}

# 컨테이너 시작 대기
echo "⏳ 애플리케이션 초기화 대기 (40초)..."
sleep 40

# Health check
echo ""
echo -e "${YELLOW}🏥 Health Check...${NC}"
if curl -sf http://localhost:3000/api/health > /dev/null; then
    echo -e "${GREEN}✅ Health Check 성공!${NC}"
else
    echo -e "${RED}❌ Health Check 실패${NC}"
    echo ""
    echo "로그 확인:"
    docker logs care_test_frontend --tail 50
    exit 1
fi

# 상태 확인
echo ""
echo "📊 컨테이너 상태:"
docker ps --filter "name=care_test" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 로그 확인
echo ""
echo "📝 최근 로그:"
docker logs care_test_frontend --tail 20

# 테스트 결과
echo ""
echo -e "${GREEN}✅ Docker 로컬 테스트 성공!${NC}"
echo ""
echo "🌐 접속 정보:"
echo "  - 애플리케이션: http://localhost:3000"
echo "  - Health Check: http://localhost:3000/api/health"
echo ""
echo "📋 유용한 명령어:"
echo "  - 로그 확인: docker logs -f care_test_frontend"
echo "  - 컨테이너 중지: docker stop care_test_frontend care_test_redis"
echo "  - 컨테이너 제거: docker rm care_test_frontend care_test_redis"
echo ""
echo "🛑 테스트 종료 시:"
echo "  ./scripts/docker-stop-local.sh"
