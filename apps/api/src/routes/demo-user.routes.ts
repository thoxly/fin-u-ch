import { Router } from 'express';
import { DemoUserController } from '../controllers/demo-user.controller';
import prisma from '../config/db';

const router: Router = Router();
const demoUserController = new DemoUserController(prisma);

/**
 * @swagger
 * tags:
 *   name: Demo
 *   description: Demo user management endpoints
 */

/**
 * @swagger
 * /api/demo/credentials:
 *   get:
 *     summary: Get demo user credentials
 *     description: Returns the credentials for the demo user account
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
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: demo@example.com
 *                     password:
 *                       type: string
 *                       example: demo123
 *                     companyName:
 *                       type: string
 *                       example: Демо Компания ООО
 */
router.get('/credentials', demoUserController.getCredentials);

/**
 * @swagger
 * /api/demo/info:
 *   get:
 *     summary: Get demo user information
 *     description: Returns detailed information about the demo user and their data
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                     company:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         currencyBase:
 *                           type: string
 *                     operationsCount:
 *                       type: number
 *                     plansCount:
 *                       type: number
 *                     accountsCount:
 *                       type: number
 *                     articlesCount:
 *                       type: number
 *                     counterpartiesCount:
 *                       type: number
 *       404:
 *         description: Demo user not found
 */
router.get('/info', demoUserController.getInfo);

/**
 * @swagger
 * /api/demo/exists:
 *   get:
 *     summary: Check if demo user exists
 *     description: Checks whether the demo user account exists in the system
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
 *                   example: true
 *                 exists:
 *                   type: boolean
 *                   example: true
 */
router.get('/exists', demoUserController.checkExists);

/**
 * @swagger
 * /api/demo/create:
 *   post:
 *     summary: Create demo user with sample data
 *     description: Creates a demo user account with sample financial data for demonstration purposes
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
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isActive:
 *                           type: boolean
 *                     company:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         currencyBase:
 *                           type: string
 *                     operationsCount:
 *                       type: number
 *                     plansCount:
 *                       type: number
 *                     accountsCount:
 *                       type: number
 *                     articlesCount:
 *                       type: number
 *                     counterpartiesCount:
 *                       type: number
 *                 message:
 *                   type: string
 *                   example: Demo user created successfully
 *       500:
 *         description: Failed to create demo user
 */
router.post('/create', demoUserController.create);

/**
 * @swagger
 * /api/demo/delete:
 *   delete:
 *     summary: Delete demo user and all related data
 *     description: Permanently deletes the demo user account and all associated data
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
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Demo user deleted successfully
 *       500:
 *         description: Failed to delete demo user
 */
router.delete('/delete', demoUserController.delete);

export default router;
