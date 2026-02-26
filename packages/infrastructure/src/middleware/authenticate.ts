import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { UnauthorizedError } from '../errors/AppError.js';
import { MessageCode } from '@rajkumarganesan93/api';

/**
 * Decoded user from a Keycloak (or any OIDC) JWT access token.
 * Attached to `req.user` after successful authentication.
 */
export interface AuthUser {
  /** Subject (Keycloak user ID) */
  sub: string;
  /** Email from token claims */
  email?: string;
  /** Preferred username */
  preferredUsername?: string;
  /** Full name */
  name?: string;
  /** Realm-level roles from `realm_access.roles` */
  realmRoles: string[];
  /** Resource-level roles from `resource_access.<clientId>.roles` */
  resourceRoles: string[];
  /** Raw decoded token payload */
  tokenPayload: Record<string, unknown>;
}

/**
 * Extends Express Request with the authenticated user.
 *
 * Usage in controllers:
 *   const user = (req as AuthenticatedRequest).user;
 */
export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export interface AuthConfig {
  /** Keycloak issuer URL, e.g. http://localhost:8080/realms/cargoez */
  issuer: string;
  /** Expected audience (client_id). If omitted, audience is not validated. */
  audience?: string;
  /**
   * Paths that skip authentication (prefix match).
   * Defaults to ['/health', '/api-docs'].
   */
  publicPaths?: string[];
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

function getSigningKey(client: jwksClient.JwksClient, header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new UnauthorizedError(MessageCode.UNAUTHORIZED));
    }
    client.getSigningKey(header.kid, (err, key) => {
      if (err || !key) return reject(new UnauthorizedError(MessageCode.UNAUTHORIZED));
      resolve(key.getPublicKey());
    });
  });
}

function extractRealmRoles(payload: Record<string, unknown>): string[] {
  const realmAccess = payload.realm_access as { roles?: string[] } | undefined;
  return realmAccess?.roles ?? [];
}

function extractResourceRoles(payload: Record<string, unknown>, audience?: string): string[] {
  const resourceAccess = payload.resource_access as Record<string, { roles?: string[] }> | undefined;
  if (!resourceAccess) return [];
  if (audience && resourceAccess[audience]) {
    return resourceAccess[audience].roles ?? [];
  }
  return Object.values(resourceAccess).flatMap((r) => r.roles ?? []);
}

const DEFAULT_PUBLIC_PATHS = ['/health', '/api-docs'];

/**
 * Creates an Express middleware that validates JWT Bearer tokens against
 * a Keycloak (or any OIDC) provider using JWKS key discovery.
 *
 * On success, attaches `AuthUser` to `req.user`.
 * On failure, throws `UnauthorizedError` (401) or `TOKEN_EXPIRED` (401).
 *
 * Usage:
 *   app.use(createAuthMiddleware({
 *     issuer: process.env.KEYCLOAK_ISSUER!,
 *     audience: process.env.KEYCLOAK_AUDIENCE,
 *   }));
 */
export function createAuthMiddleware(config: AuthConfig) {
  const { issuer, audience, publicPaths = DEFAULT_PUBLIC_PATHS } = config;
  const client = getJwksClient(issuer);

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (publicPaths.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new UnauthorizedError(MessageCode.UNAUTHORIZED));
    }

    const token = authHeader.slice(7);

    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return next(new UnauthorizedError(MessageCode.UNAUTHORIZED));
      }

      const publicKey = await getSigningKey(client, decoded.header);

      const verifyOptions: jwt.VerifyOptions = {
        issuer,
        algorithms: ['RS256'],
      };
      if (audience) {
        verifyOptions.audience = audience;
      }

      const payload = jwt.verify(token, publicKey, verifyOptions) as Record<string, unknown>;

      const authUser: AuthUser = {
        sub: payload.sub as string,
        email: payload.email as string | undefined,
        preferredUsername: payload.preferred_username as string | undefined,
        name: payload.name as string | undefined,
        realmRoles: extractRealmRoles(payload),
        resourceRoles: extractResourceRoles(payload, audience),
        tokenPayload: payload,
      };

      (req as AuthenticatedRequest).user = authUser;
      next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(new UnauthorizedError(MessageCode.TOKEN_EXPIRED));
      }
      if (err instanceof UnauthorizedError) {
        return next(err);
      }
      return next(new UnauthorizedError(MessageCode.UNAUTHORIZED));
    }
  };
}
