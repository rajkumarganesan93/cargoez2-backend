FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/shared-db-example/package.json ./services/shared-db-example/

RUN npm install

COPY services/shared-db-example ./services/shared-db-example
RUN npm run build:packages && npm run build -w @cargoez-be/shared-db-example

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY packages ./packages
COPY services/shared-db-example/package.json ./services/shared-db-example/

RUN npm install --omit=dev

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/services/shared-db-example/dist ./services/shared-db-example/dist
COPY --from=builder /app/services/shared-db-example/package.json ./services/shared-db-example/

WORKDIR /app/services/shared-db-example
EXPOSE 3005
CMD ["node", "dist/index.js"]
