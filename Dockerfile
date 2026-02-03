# ============================================
# CareMatch V3 Production Dockerfile
# Next.js 15 + Standalone Output
# ============================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 의존성 파일 복사
COPY package.json pnpm-lock.yaml ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# ============================================
# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# pnpm 설치
RUN npm install -g pnpm

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드 복사
COPY . .

# 환경 변수 (빌드 타임에 필요한 것들만)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js 빌드
RUN pnpm build

# ============================================
# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 보안을 위한 non-root 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# public 폴더 복사
COPY --from=builder /app/public ./public

# standalone 빌드 결과 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# nextjs 사용자로 전환
USER nextjs

# 포트 노출
EXPOSE 3000

# 환경 변수
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 헬스체크 (선택사항)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 애플리케이션 실행
CMD ["node", "server.js"]
