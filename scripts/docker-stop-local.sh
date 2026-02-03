#!/bin/bash

# ============================================
# Docker Local Test Cleanup Script
# ============================================

echo "🛑 Docker 로컬 테스트 정리"
echo "========================"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 컨테이너 중지 및 제거
echo -e "${YELLOW}🧹 컨테이너 중지 및 제거...${NC}"
docker stop care_test_frontend care_test_redis 2>/dev/null || true
docker rm care_test_frontend care_test_redis 2>/dev/null || true

echo -e "${GREEN}✅ 정리 완료${NC}"
echo ""
echo "남은 컨테이너:"
docker ps -a --filter "name=care_test"
