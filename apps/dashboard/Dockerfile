FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json

RUN pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/dashboard apps/dashboard

ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @pilab/dashboard build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/apps/dashboard/dist /usr/share/nginx/html

EXPOSE 80
