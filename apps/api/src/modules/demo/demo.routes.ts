import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import demoUserController from './demo.controller';

const router: Router = Router();

/**
 * @swagger
 * tags:
 *   name: Demo
 *   description: Demo user management endpoints
 */

// Публичный endpoint для получения кредов (без аутентификации)
router.get('/credentials', demoUserController.getCredentials);

// Защищенные endpoints (требуют аутентификации)
router.use(authenticate);
router.use(extractTenant);

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
router.get('/info', demoUserController.getInfo);

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
router.get('/exists', demoUserController.checkExists);

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
router.post('/create', demoUserController.create);

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
router.delete('/delete', demoUserController.delete);

export default router;
