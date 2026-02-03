# ============================================
# CareMatch V3 - Makefile
# Docker 관리 명령어
# ============================================

.PHONY: help build up down restart logs ps clean

# 기본 Docker Compose 파일
COMPOSE_FILE := docker-compose.care.yml

# Help
help:
	@echo "CareMatch V3 Docker Commands"
	@echo "============================="
	@echo "make build    - Docker 이미지 빌드"
	@echo "make up       - 컨테이너 시작 (백그라운드)"
	@echo "make down     - 컨테이너 중지 및 제거"
	@echo "make restart  - 컨테이너 재시작"
	@echo "make logs     - 로그 실시간 확인"
	@echo "make ps       - 컨테이너 상태 확인"
	@echo "make shell    - frontend 컨테이너 쉘 접속"
	@echo "make clean    - 컨테이너 및 볼륨 모두 제거"
	@echo ""
	@echo "Example:"
	@echo "  make build up    # 빌드 후 시작"
	@echo "  make logs        # 로그 확인"

# Docker 이미지 빌드
build:
	docker compose -f $(COMPOSE_FILE) build

# 컨테이너 시작
up:
	docker compose -f $(COMPOSE_FILE) up -d

# 컨테이너 중지
down:
	docker compose -f $(COMPOSE_FILE) down

# 컨테이너 재시작
restart:
	docker compose -f $(COMPOSE_FILE) restart

# 로그 확인
logs:
	docker compose -f $(COMPOSE_FILE) logs -f

# 특정 서비스 로그
logs-frontend:
	docker compose -f $(COMPOSE_FILE) logs -f frontend

logs-redis:
	docker compose -f $(COMPOSE_FILE) logs -f redis

# 컨테이너 상태
ps:
	docker compose -f $(COMPOSE_FILE) ps

# Frontend 컨테이너 쉘 접속
shell:
	docker compose -f $(COMPOSE_FILE) exec frontend /bin/sh

# Redis CLI
redis-cli:
	docker compose -f $(COMPOSE_FILE) exec redis redis-cli

# 모두 제거 (데이터 포함)
clean:
	docker compose -f $(COMPOSE_FILE) down -v
	@echo "모든 컨테이너와 볼륨이 제거되었습니다."

# 개발 워크플로우
dev: build up logs

# 프로덕션 배포 (빌드 + 시작)
deploy: build up
	@echo "배포 완료!"
	@echo "접속 URL: http://localhost:9000"
