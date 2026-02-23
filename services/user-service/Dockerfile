FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/user-service/package.json ./services/user-service/

RUN npm install

COPY services/user-service ./services/user-service
RUN npm run build:packages && npm run build -w @cargoez-be/user-service

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/user-service/package.json ./services/user-service/

RUN npm install --omit=dev

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/user-service/dist ./services/user-service/dist
COPY --from=builder /app/services/user-service/package.json ./services/user-service/

WORKDIR /app/services/user-service
EXPOSE 3001
CMD ["node", "dist/index.js"]
