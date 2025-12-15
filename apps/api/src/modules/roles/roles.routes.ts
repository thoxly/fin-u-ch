import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import { requirePermission } from '../../middlewares/permissions';
import rolesController from './roles.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles for company
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 */
router.get(
  '/',
  requirePermission('users', 'manage_roles'),
  rolesController.getAll
);

/**
 * @swagger
 * /api/roles/category/{category}:
 *   get:
 *     summary: Get roles by category
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of roles in category
 */
router.get(
  '/category/:category',
  requirePermission('users', 'manage_roles'),
  rolesController.getByCategory
);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     tags: [Roles]
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
 *         description: Role details
 *       404:
 *         description: Role not found
 */
router.get(
  '/:id',
  requirePermission('users', 'manage_roles'),
  rolesController.getById
);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Role created
 *       409:
 *         description: Role with this name already exists
 */
router.post(
  '/',
  requirePermission('users', 'manage_roles'),
  rolesController.create
);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update role
 *     tags: [Roles]
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role updated
 *       403:
 *         description: Cannot update system role
 *       404:
 *         description: Role not found
 */
router.put(
  '/:id',
  requirePermission('users', 'manage_roles'),
  rolesController.update
);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete role (soft delete)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Role deleted
 *       403:
 *         description: Cannot delete system role
 *       404:
 *         description: Role not found
 */
router.delete(
  '/:id',
  requirePermission('users', 'manage_roles'),
  rolesController.delete
);

/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   get:
 *     summary: Get role permissions
 *     tags: [Roles]
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
 *         description: Role permissions grouped by entity
 *       404:
 *         description: Role not found
 */
router.get(
  '/:id/permissions',
  requirePermission('users', 'manage_roles'),
  rolesController.getPermissions
);

/**
 * @swagger
 * /api/roles/{id}/permissions:
 *   put:
 *     summary: Update role permissions
 *     tags: [Roles]
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
 *               - permissions
 *             properties:
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - entity
 *                     - action
 *                     - allowed
 *                   properties:
 *                     entity:
 *                       type: string
 *                     action:
 *                       type: string
 *                     allowed:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Permissions updated
 *       403:
 *         description: Cannot update permissions of system role
 *       404:
 *         description: Role not found
 */
router.put(
  '/:id/permissions',
  requirePermission('users', 'manage_roles'),
  rolesController.updatePermissions
);

export default router;
