FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/user-service/package.json ./services/user-service/
COPY services/auth-service/package.json ./services/auth-service/

RUN npm install

COPY services/auth-service ./services/auth-service
RUN npm run build:packages && npm run build -w @cargoez-be/auth-service

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/user-service/package.json ./services/user-service/
COPY services/auth-service/package.json ./services/auth-service/

RUN npm install --omit=dev

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/auth-service/dist ./services/auth-service/dist
COPY --from=builder /app/services/auth-service/package.json ./services/auth-service/

WORKDIR /app/services/auth-service
EXPOSE 3003
CMD ["node", "dist/index.js"]
