import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import { requirePermission } from '../../middlewares/permissions';
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
// /me endpoints доступны всем аутентифицированным пользователям без проверки прав
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
 * /api/users/me/confirm-email-change-old:
 *   post:
 *     summary: Confirm old email for email change
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
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Old email confirmed, verification email sent to new email
 *       400:
 *         description: Invalid or expired token
 */
router.post(
  '/me/confirm-email-change-old',
  usersController.confirmOldEmailForChange
);

/**
 * @swagger
 * /api/users/me/confirm-email-change:
 *   post:
 *     summary: Confirm new email and complete email change
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
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email changed successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/me/confirm-email-change', usersController.confirmEmailChange);

/**
 * @swagger
 * /api/users/me/preferences:
 *   get:
 *     summary: Get current user preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences
 */
router.get('/me/preferences', usersController.getPreferences);

/**
 * @swagger
 * /api/users/me/preferences:
 *   put:
 *     summary: Update current user preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [light, dark, system]
 *               navigationIcons:
 *                 type: object
 *     responses:
 *       200:
 *         description: Preferences updated
 */
router.put('/me/preferences', usersController.updatePreferences);

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
router.get('/', requirePermission('users', 'read'), usersController.getAll);

/**
 * @swagger
 * /api/users/invite:
 *   post:
 *     summary: Invite user by email
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
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User invited successfully
 *       409:
 *         description: Пользователь с таким email уже существует в вашей компании
 */
router.post(
  '/invite',
  requirePermission('users', 'create'),
  usersController.inviteUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       403:
 *         description: Cannot deactivate super administrator
 *       404:
 *         description: User not found
 */
router.patch(
  '/:id',
  requirePermission('users', 'update'),
  usersController.updateUser
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Cannot delete super administrator
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  requirePermission('users', 'delete'),
  usersController.deleteUser
);

/**
 * @swagger
 * /api/users/{id}/roles:
 *   get:
 *     summary: Get user roles
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user roles
 *       404:
 *         description: User not found
 */
router.get(
  '/:id/roles',
  requirePermission('users', 'read'),
  usersController.getUserRoles
);

/**
 * @swagger
 * /api/users/{id}/roles:
 *   post:
 *     summary: Assign role to user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roleId
 *             properties:
 *               roleId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role assigned successfully
 *       404:
 *         description: User or role not found
 *       409:
 *         description: Role is already assigned to this user
 */
router.post(
  '/:id/roles',
  requirePermission('users', 'manage_roles'),
  usersController.assignRole
);

/**
 * @swagger
 * /api/users/{id}/roles/{roleId}:
 *   delete:
 *     summary: Remove role from user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role removed successfully
 *       403:
 *         description: Cannot remove system role
 *       404:
 *         description: User, role, or assignment not found
 */
router.delete(
  '/:id/roles/:roleId',
  requirePermission('users', 'manage_roles'),
  usersController.removeRole
);

/**
 * @swagger
 * /api/users/{id}/permissions:
 *   get:
 *     summary: Get user permissions
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User permissions grouped by entity
 *       404:
 *         description: User not found
 */
// Пользователь может получить свои права без проверки, для других нужна проверка
router.get('/:id/permissions', usersController.getUserPermissions);

export default router;
