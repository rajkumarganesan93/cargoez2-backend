import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { domainEventBus, DomainEvent } from '../events/domain-event-bus';

const ROOM_PATTERN = /^(entity|tenant):[a-zA-Z0-9_-]+(:[a-zA-Z0-9_-]+)?$/;

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://localhost:5177',
      'http://localhost:4200',
      'http://localhost:8100',
    ],
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server!: Server;
  private logger = new Logger('RealtimeGateway');
  private jwksClient: jwksClient.JwksClient;
  private issuer: string;

  constructor() {
    const keycloakUrl = process.env['KEYCLOAK_URL'] || 'http://localhost:8080';
    const realm = process.env['KEYCLOAK_REALM'] || 'cargoez';
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.jwksClient = jwksClient({
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
      cache: true,
    });
  }

  onModuleInit() {
    domainEventBus.on((event: DomainEvent) => {
      this.server.to(`entity:${event.entity}`).emit('data-changed', event);
      if (event.entityId) {
        this.server.to(`entity:${event.entity}:${event.entityId}`).emit('data-changed', event);
      }
      if (event.tenantId) {
        this.server.to(`tenant:${event.tenantId}`).emit('data-changed', event);
      }
    });
  }

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }
      const decoded = await this.verifyToken(token);
      (client as any).user = decoded;
      this.logger.log(`Client connected: ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
    if (!ROOM_PATTERN.test(data.room)) return { error: 'Invalid room name' };
    client.join(data.room);
    return { subscribed: data.room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { room: string }) {
    client.leave(data.room);
    return { unsubscribed: data.room };
  }

  private verifyToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.jwksClient.getSigningKey(header.kid, (err, key) => {
            if (err) return callback(err);
            callback(null, key?.getPublicKey());
          });
        },
        { issuer: this.issuer },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded);
        },
      );
    });
  }
}
