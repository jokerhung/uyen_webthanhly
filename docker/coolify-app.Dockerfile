# Next.js and Prisma run in a single container; database migration is an explicit
# deployment step, not an automatic side effect of starting the web server.
FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Only server-side runtime secrets are injected by Coolify, never at image build.
# DATABASE_URL is used for generating Prisma types, not connecting to a database.
RUN npx prisma generate && npm run build

FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/scripts/next-with-env.mjs ./scripts/next-with-env.mjs
RUN mkdir -p /data/consignments && chown -R node:node /data
USER node
EXPOSE 3000
CMD ["node", "scripts/next-with-env.mjs", "start", "--hostname", "0.0.0.0"]
