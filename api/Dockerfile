# --- build: install all deps, compile TypeScript, then drop dev deps ---
FROM node:24-alpine AS build
WORKDIR /app

# Dependencies first, so this layer is cached until package*.json changes.
# .npmrc pins the public npm registry.
COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- runtime: compiled JS + production deps only, non-root user ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# 1) seed: applies pending migrations, inserts demo data only into an empty DB
# 2) start the API (its own migrationsRun is then a no-op)
CMD ["sh", "-c", "node dist/database/seed.js && exec node dist/main.js"]
