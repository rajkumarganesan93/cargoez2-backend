import { Router } from 'express';
import { asyncHandler } from '@cargoez2/shared';
import { success } from '@cargoez2/api';
import type { AuthController } from './controllers/AuthController.js';

export function createAuthRoutes(controller: AuthController): Router {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Health check
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  router.get('/health', (_req, res) => {
    res.json(success({ status: 'ok' }));
  });

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     summary: Login with email and password
   *     description: Validates credentials and returns an access token for API authentication.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 format: password
   *     responses:
   *       200:
   *         description: Login successful, returns token and user info
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                   description: Bearer token for Authorization header
   *                 expiresAt:
   *                   type: string
   *                   format: date-time
   *                 userId:
   *                   type: string
   *                   format: uuid
   *                 email:
   *                   type: string
   *       400:
   *         description: Bad request - email and password required
   *       401:
   *         description: Invalid email or password
   *       500:
   *         description: Internal server error
   */
  router.post('/auth/login', asyncHandler(controller.login.bind(controller)));

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     summary: Register a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               roleName:
   *                 type: string
   *     responses:
   *       201:
   *         description: User registered successfully
   *       400:
   *         description: Bad request
   *       409:
   *         description: Email already exists
   */
  router.post('/auth/register', asyncHandler(controller.register.bind(controller)));

  /**
   * @openapi
   * /auth/validate:
   *   get:
   *     summary: Validate a token
   *     parameters:
   *       - in: header
   *         name: Authorization
   *         schema:
   *           type: string
   *           example: Bearer <token>
   *       - in: query
   *         name: token
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Token valid
   *       401:
   *         description: Token invalid or expired
   */
  router.get('/auth/validate', asyncHandler(controller.validateToken.bind(controller)));

  return router;
}
