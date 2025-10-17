import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { DemoUserService } from '../services/demo-user.service';
import logger from '../config/logger';

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
 *             isActive:
 *               type: boolean
 *         company:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             currencyBase:
 *               type: string
 *         operationsCount:
 *           type: number
 *         plansCount:
 *           type: number
 *         accountsCount:
 *           type: number
 *         articlesCount:
 *           type: number
 *         counterpartiesCount:
 *           type: number
 */
export class DemoUserController {
  private demoUserService: DemoUserService;

  constructor(private prisma: PrismaClient) {
    this.demoUserService = new DemoUserService(prisma);
  }

  /**
   * @swagger
   * /api/demo/credentials:
   *   get:
   *     summary: Get demo user credentials
   *     tags: [Demo]
   *     responses:
   *       200:
   *         description: Demo user credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/DemoUserCredentials'
   */
  getCredentials = async (req: Request, res: Response): Promise<void> => {
    try {
      const credentials = this.demoUserService.getCredentials();

      res.json({
        success: true,
        data: credentials,
      });
    } catch (error) {
      logger.error('Failed to get demo credentials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get demo credentials',
      });
    }
  };

  /**
   * @swagger
   * /api/demo/info:
   *   get:
   *     summary: Get demo user information
   *     tags: [Demo]
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
   *                 data:
   *                   $ref: '#/components/schemas/DemoUserData'
   *       404:
   *         description: Demo user not found
   */
  getInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const info = await this.demoUserService.getInfo();

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
      logger.error('Failed to get demo user info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get demo user info',
      });
    }
  };

  /**
   * @swagger
   * /api/demo/exists:
   *   get:
   *     summary: Check if demo user exists
   *     tags: [Demo]
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
   *                 exists:
   *                   type: boolean
   */
  checkExists = async (req: Request, res: Response): Promise<void> => {
    try {
      const exists = await this.demoUserService.exists();

      res.json({
        success: true,
        exists,
      });
    } catch (error) {
      logger.error('Failed to check demo user existence:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check demo user existence',
      });
    }
  };

  /**
   * @swagger
   * /api/demo/create:
   *   post:
   *     summary: Create demo user with sample data
   *     tags: [Demo]
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
   *                 data:
   *                   $ref: '#/components/schemas/DemoUserData'
   *       500:
   *         description: Failed to create demo user
   */
  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const demoUserData = await this.demoUserService.create();

      res.status(201).json({
        success: true,
        data: demoUserData,
        message: 'Demo user created successfully',
      });
    } catch (error) {
      logger.error('Failed to create demo user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create demo user',
      });
    }
  };

  /**
   * @swagger
   * /api/demo/delete:
   *   delete:
   *     summary: Delete demo user and all related data
   *     tags: [Demo]
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
   *                 message:
   *                   type: string
   *       500:
   *         description: Failed to delete demo user
   */
  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.demoUserService.delete();

      res.json({
        success: true,
        message: 'Demo user deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete demo user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete demo user',
      });
    }
  };
}
