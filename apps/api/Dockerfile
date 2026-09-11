# Build context is the REPO ROOT (this is a monorepo workspace and apps/api
# depends on packages/shared): docker build -f apps/api/Dockerfile .

FROM node:20-slim AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run build --workspace=apps/api

FROM node:20-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev

COPY --from=build /repo/apps/api/dist apps/api/dist
COPY apps/api/prisma apps/api/prisma
RUN npm exec -w apps/api -- prisma generate

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
