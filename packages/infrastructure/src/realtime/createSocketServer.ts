import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { domainEventBus, type DomainEvent } from '../events/DomainEventBus.js';
import type { AuthConfig } from '../middleware/authenticate.js';
import type pino from 'pino';

export interface RealtimeConfig {
  /**
   * CORS origins allowed for Socket.IO connections.
   * Defaults to '*' (all origins) for development convenience.
   */
  corsOrigins?: string | string[];
}

interface SubscribePayload {
  room: string;
}

const jwksClients = new Map<string, jwksClient.JwksClient>();

function getJwksClient(issuer: string): jwksClient.JwksClient {
  let client = jwksClients.get(issuer);
  if (!client) {
    client = jwksClient({
      jwksUri: `${issuer}/protocol/openid-connect/certs`,
      cache: true,
      cacheMaxAge: 600_000,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
    jwksClients.set(issuer, client);
  }
  return client;
}

function getSigningKey(client: jwksClient.JwksClient, kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error('Signing key not found'));
      resolve(key.getPublicKey());
    });
  });
}

/**
 * Validate room names to prevent arbitrary channel subscriptions.
 * Allowed patterns:
 *   entity:{tableName}           — watch all changes for an entity type
 *   entity:{tableName}:{id}      — watch a specific record
 *   tenant:{tenantId}            — tenant-scoped events
 */
const ROOM_PATTERN = /^(entity:[a-z_]+(?::[a-f0-9-]+)?|tenant:[a-z0-9_-]+)$/i;

function isValidRoom(room: string): boolean {
  return ROOM_PATTERN.test(room);
}

/**
 * Creates and attaches a Socket.IO server to the given HTTP server.
 * Handles JWT authentication on handshake, room subscriptions, and
 * forwards DomainEventBus events to connected clients.
 *
 * Clients connect with:
 *   const socket = io('http://localhost:3001', { auth: { token: jwtToken } });
 *
 * Clients subscribe to rooms:
 *   socket.emit('subscribe', { room: 'entity:users' });
 *   socket.emit('unsubscribe', { room: 'entity:users' });
 *
 * Clients receive events:
 *   socket.on('entity.created', (event) => { ... });
 *   socket.on('entity.updated', (event) => { ... });
 *   socket.on('entity.deleted', (event) => { ... });
 */
export function createSocketServer(
  httpServer: HttpServer,
  authConfig: AuthConfig | undefined,
  logger: pino.Logger,
  realtimeConfig?: RealtimeConfig,
): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: realtimeConfig?.corsOrigins ?? '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  if (authConfig) {
    const client = getJwksClient(authConfig.issuer);

    io.use(async (socket, next) => {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
          return next(new Error('Invalid token'));
        }

        const publicKey = await getSigningKey(client, decoded.header.kid);
        const verifyOptions: jwt.VerifyOptions = {
          issuer: authConfig.issuer,
          algorithms: ['RS256'],
        };
        if (authConfig.audience) {
          verifyOptions.audience = authConfig.audience;
        }

        const payload = jwt.verify(token, publicKey, verifyOptions) as Record<string, unknown>;
        socket.data.userId = (payload.sub ?? payload.preferred_username) as string;
        socket.data.tenantId = payload.tenant_id as string | undefined;
        socket.data.roles = (payload.realm_access as { roles?: string[] })?.roles ?? [];
        next();
      } catch {
        next(new Error('Token verification failed'));
      }
    });
  }

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.data.userId }, 'Socket connected');

    if (socket.data.tenantId) {
      socket.join(`tenant:${socket.data.tenantId}`);
    }

    socket.on('subscribe', (payload: SubscribePayload) => {
      if (!payload?.room || !isValidRoom(payload.room)) {
        socket.emit('error', { message: `Invalid room: ${payload?.room}` });
        return;
      }
      socket.join(payload.room);
      logger.debug({ socketId: socket.id, room: payload.room }, 'Joined room');
    });

    socket.on('unsubscribe', (payload: SubscribePayload) => {
      if (payload?.room) {
        socket.leave(payload.room);
        logger.debug({ socketId: socket.id, room: payload.room }, 'Left room');
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug({ socketId: socket.id, reason }, 'Socket disconnected');
    });
  });

  domainEventBus.onDomainEvent((event: DomainEvent) => {
    const eventName = `entity.${event.action}`;
    const entityRoom = `entity:${event.entity}`;
    const entityDetailRoom = `entity:${event.entity}:${event.entityId}`;

    io.to(entityRoom).to(entityDetailRoom).emit(eventName, event);

    if (event.tenantId) {
      io.to(`tenant:${event.tenantId}`).emit(eventName, event);
    }

    logger.debug({ event: eventName, entity: event.entity, entityId: event.entityId }, 'Domain event broadcast');
  });

  logger.info('Real-time (Socket.IO) enabled');
  return io;
}
