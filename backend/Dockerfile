# ---- test stage: used by Jenkins (docker build --target test) ----
FROM node:20-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN node --test

# ---- production dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime image (default target) ----
FROM node:20-alpine
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# runtime-data/ holds logs.json and goals.json; mounted as a volume in Kubernetes
RUN mkdir -p runtime-data
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:4000/api/health || exit 1
CMD ["node", "server.js"]
