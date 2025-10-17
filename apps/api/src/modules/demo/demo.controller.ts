import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import demoUserService from './demo.service';
import logger from '../../config/logger';

/**
 * @swagger
 * components:
 *   schemas:
 *     DemoUserCredentials:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           example: demo@example.com
 *         password:
 *           type: string
 *           example: demo123
 *         companyName:
 *           type: string
 *           example: Демо Компания ООО
 *     DemoUserData:
 *       type: object
 *       properties:
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             email:
 *               type: string
 *             companyId:
 *               type: string
 *         company:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *         statistics:
 *           type: object
 *           properties:
 *             operationsCount:
 *               type: number
 *             plansCount:
 *               type: number
 *             accountsCount:
 *               type: number
 *             articlesCount:
 *               type: number
 *             counterpartiesCount:
 *               type: number
 */

export class DemoUserController {
  /**
   * @swagger
   * /api/demo/credentials:
   *   get:
   *     summary: Get demo user credentials
   *     description: Returns demo user login credentials for testing
   *     tags: [Demo]
   *     responses:
   *       200:
   *         description: Demo user credentials
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
  async getCredentials(req: TenantRequest, res: Response, next: NextFunction) {
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
   *         description: Demo user information
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
  async getInfo(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const info = await demoUserService.getInfo();
      if (!info) {
        return res.status(404).json({
          success: false,
          error: 'Demo user not found',
        });
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
   *         description: Demo user existence status
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
  async checkExists(req: TenantRequest, res: Response, next: NextFunction) {
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
   * /api/demo/create:
   *   post:
   *     summary: Create demo user
   *     description: Creates a new demo user with sample data for testing
   *     tags: [Demo]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       201:
   *         description: Demo user created successfully
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
   *                   example: Demo user created successfully
   *       409:
   *         description: Demo user already exists
   *       500:
   *         description: Failed to create demo user
   */
  async create(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const exists = await demoUserService.exists();
      if (exists) {
        return res.status(409).json({
          success: false,
          error: 'Demo user already exists',
        });
      }

      await demoUserService.create();
      res.status(201).json({
        success: true,
        message: 'Demo user created successfully',
      });
    } catch (error) {
      logger.error('Failed to create demo user', { error });
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
  async delete(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const exists = await demoUserService.exists();
      if (!exists) {
        return res.status(404).json({
          success: false,
          error: 'Demo user not found',
        });
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

export default new DemoUserController();
