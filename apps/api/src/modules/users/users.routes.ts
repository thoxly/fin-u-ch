import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import usersController from './users.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User data
 */
router.get('/me', usersController.getMe);

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch('/me', usersController.updateMe);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users in company
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', usersController.getAll);

/**
 * @swagger
 * /api/users/me/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 */
router.post('/me/change-password', usersController.changePassword);

/**
 * @swagger
 * /api/users/me/request-email-change:
 *   post:
 *     summary: Request email change
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newEmail
 *             properties:
 *               newEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Verification email sent
 *       409:
 *         description: Email already in use
 */
router.post('/me/request-email-change', usersController.requestEmailChange);

/**
 * @swagger
 * /api/users/me/confirm-email-change:
 *   post:
 *     summary: Confirm email change
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newEmail
 *             properties:
 *               token:
 *                 type: string
 *               newEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email changed successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/me/confirm-email-change', usersController.confirmEmailChange);

export default router;
