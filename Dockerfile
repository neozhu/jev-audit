FROM oven/bun:1.4.2-alpine AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1.4.2-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=build /app/dist ./dist
COPY server.ts ./server.ts
COPY src/types/jev.ts ./src/types/jev.ts

USER bun
EXPOSE 3000
CMD ["bun", "server.ts"]
