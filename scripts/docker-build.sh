#!/bin/bash

# ============================================
# Docker Build Script for CareMatch V3
# ============================================

set -e

echo "🐳 CareMatch V3 Docker Build Script"
echo "===================================="

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Docker daemon 확인
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker daemon이 실행되지 않았습니다.${NC}"
    echo "Docker Desktop을 실행해주세요."
    exit 1
fi

echo -e "${GREEN}✓ Docker daemon 실행 중${NC}"

# 이미지 태그 설정
IMAGE_NAME="carematch-v3"
IMAGE_TAG="${1:-latest}"
FULL_TAG="${IMAGE_NAME}:${IMAGE_TAG}"

echo ""
echo "📦 빌드 설정:"
echo "  - 이미지: ${FULL_TAG}"
echo "  - 빌드 컨텍스트: $(pwd)"
echo ""

# 기존 빌드 캐시 정리 (선택사항)
read -p "기존 빌드 캐시를 정리하시겠습니까? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧹 빌드 캐시 정리 중...${NC}"
    docker builder prune -f
fi

# Docker 빌드 시작
echo ""
echo -e "${YELLOW}🔨 Docker 이미지 빌드 시작...${NC}"
echo ""

docker build \
    --tag "${FULL_TAG}" \
    --build-arg NODE_ENV=production \
    --progress=plain \
    .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 빌드 성공!${NC}"
    echo ""
    echo "📊 이미지 정보:"
    docker images "${IMAGE_NAME}" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    echo "🚀 다음 단계:"
    echo "  1. 로컬 테스트: ./scripts/docker-test-local.sh"
    echo "  2. 서버 배포: ./scripts/docker-deploy.sh"
else
    echo ""
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
fi
