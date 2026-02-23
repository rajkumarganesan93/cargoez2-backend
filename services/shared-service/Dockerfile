FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY services/shared-service/package.json ./services/shared-service/

RUN npm install

COPY services/shared-service ./services/shared-service
RUN npm run build -w @cargoez-be/shared && npm run build -w @cargoez-be/shared-service

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY services/shared-service/package.json ./services/shared-service/

RUN npm install --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/services/shared-service/dist ./services/shared-service/dist
COPY --from=builder /app/services/shared-service/package.json ./services/shared-service/

WORKDIR /app/services/shared-service
EXPOSE 3004
CMD ["node", "dist/index.js"]
