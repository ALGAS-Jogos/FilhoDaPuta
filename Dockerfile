# build
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/protocol/package.json packages/protocol/package.json
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# runtime
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV CLIENT_DIST=/app/apps/client/dist

COPY package.json package-lock.json ./
COPY apps/client/package.json apps/client/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/engine/package.json packages/engine/package.json
COPY packages/protocol/package.json packages/protocol/package.json
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/client/dist ./apps/client/dist

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/server/dist/index.js"]
