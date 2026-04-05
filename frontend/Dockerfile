FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:18-alpine AS builder
WORKDIR /app
# 비우면 관리자 로그인 시 서버 토큰을 직접 입력(번들에 힌트 없음). 값이 있으면 API_ADMIN_TOKEN 과 맞출 것.
ARG NEXT_PUBLIC_API_ADMIN_TOKEN=
ENV NEXT_PUBLIC_API_ADMIN_TOKEN=$NEXT_PUBLIC_API_ADMIN_TOKEN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /app/public && npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
