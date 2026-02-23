FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY services/order-service/package.json ./services/order-service/

RUN npm install

COPY services/order-service ./services/order-service
RUN npm run build -w @cargoez-be/shared && npm run build -w @cargoez-be/order-service

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY shared ./shared
COPY services/order-service/package.json ./services/order-service/

RUN npm install --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/services/order-service/dist ./services/order-service/dist
COPY --from=builder /app/services/order-service/package.json ./services/order-service/

WORKDIR /app/services/order-service
EXPOSE 3002
CMD ["node", "dist/index.js"]
