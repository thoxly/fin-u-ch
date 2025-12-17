import { Request, Response, NextFunction } from 'express';
import { DemoUserService } from './demo.service';
import logger from '../../config/logger';

interface TenantRequest extends Request {
  tenant?: {
    companyId: string;
    userId: string;
  };
}

/**
 * Контроллер для управления демо-пользователем
 */
export class DemoController {
  /**
   * @swagger
   * /api/demo/credentials:
   *   get:
   *     summary: Get demo user credentials
   *     description: Returns the demo user credentials for login
   *     tags: [Demo]
   *     responses:
   *       200:
   *         description: Demo credentials retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/DemoUserCredentials'
   *       404:
   *         description: Demo user not found
   */
  async getCredentials(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const credentials = demoUserService.getCredentials();
      res.json({
        success: true,
        data: credentials,
      });
    } catch (error) {
      logger.error('Failed to get demo credentials', { error });
      next(error);
    }
  }

  /**
   * @swagger
   * /api/demo/info:
   *   get:
   *     summary: Get demo user information
   *     description: Returns detailed information about the demo user and their data
   *     tags: [Demo]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Demo user information retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/DemoUserData'
   *       404:
   *         description: Demo user not found
   */
  async getInfo(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const info = await demoUserService.getInfo();
      if (!info) {
        res.status(404).json({
          success: false,
          error: 'Demo user not found',
        });
        return;
      }

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      logger.error('Failed to get demo user info', { error });
      next(error);
    }
  }

  /**
   * @swagger
   * /api/demo/exists:
   *   get:
   *     summary: Check if demo user exists
   *     description: Returns whether the demo user exists in the system
   *     tags: [Demo]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Demo user existence checked successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     exists:
   *                       type: boolean
   *                       example: true
   */
  async checkExists(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const exists = await demoUserService.exists();
      res.json({
        success: true,
        data: { exists },
      });
    } catch (error) {
      logger.error('Failed to check demo user existence', { error });
      next(error);
    }
  }

  /**
   * @swagger
   * /api/demo/start-session:
   *   post:
   *     summary: Start a dynamic demo session
   *     description: Creates a temporary demo user and returns authentication tokens
   *     tags: [Demo]
   *     responses:
   *       201:
   *         description: Session started successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/TokensResponse'
   */
  async startSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tokens = await demoUserService.createDynamicUser();
      res.status(201).json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      logger.error('Failed to start demo session', { error });
      next(error);
    }
  }

  /**
   * @swagger
   * /api/demo/delete:
   *   delete:
   *     summary: Delete demo user
   *     description: Deletes the demo user and all associated data
   *     tags: [Demo]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Demo user deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 message:
   *                   type: string
   *                   example: Demo user deleted successfully
   *       404:
   *         description: Demo user not found
   *       500:
   *         description: Failed to delete demo user
   */
  async delete(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const exists = await demoUserService.exists();
      if (!exists) {
        res.status(404).json({
          success: false,
          error: 'Demo user not found',
        });
        return;
      }

      await demoUserService.delete();
      res.json({
        success: true,
        message: 'Demo user deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete demo user', { error });
      next(error);
    }
  }
}

const demoUserService = new DemoUserService();
export default new DemoController();
