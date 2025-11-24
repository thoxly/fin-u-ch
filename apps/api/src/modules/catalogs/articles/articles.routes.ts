import { Router } from 'express';
import { authenticate } from '../../../middlewares/auth';
import { extractTenant } from '../../../middlewares/tenant';
import { requirePermission } from '../../../middlewares/permissions';
import articlesController from './articles.controller';

const router: Router = Router();

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Get all articles
 *     description: Returns articles as a flat list or tree structure based on asTree parameter
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by article type
 *       - in: query
 *         name: activity
 *         schema:
 *           type: string
 *           enum: [operating, investing, financing]
 *         description: Filter by activity type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: asTree
 *         schema:
 *           type: boolean
 *         description: If true, returns articles as a tree structure. Default is false (flat list)
 *     responses:
 *       200:
 *         description: List of articles (flat or tree structure)
 */
router.get(
  '/',
  requirePermission('articles', 'read'),
  articlesController.getAll
);

/**
 * @swagger
 * /api/articles/tree:
 *   get:
 *     summary: Get all articles as a tree
 *     description: Returns articles in hierarchical structure with nested children
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: Filter by article type
 *       - in: query
 *         name: activity
 *         schema:
 *           type: string
 *           enum: [operating, investing, financing]
 *         description: Filter by activity type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Tree of articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Article'
 *             example:
 *               - id: "article-1"
 *                 name: "Аренда"
 *                 type: "expense"
 *                 parentId: null
 *                 children:
 *                   - id: "article-2"
 *                     name: "Аренда Барселона"
 *                     type: "expense"
 *                     parentId: "article-1"
 *                     children: []
 *                   - id: "article-3"
 *                     name: "Аренда Лиссабон"
 *                     type: "expense"
 *                     parentId: "article-1"
 *                     children: []
 */
router.get(
  '/tree',
  requirePermission('articles', 'read'),
  articlesController.getTree
);

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
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
 *         description: Article data
 *       404:
 *         description: Article not found
 */
router.get(
  '/:id',
  requirePermission('articles', 'read'),
  articlesController.getById
);

/**
 * @swagger
 * /api/articles:
 *   post:
 *     summary: Create article
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Article created
 */
router.post(
  '/',
  requirePermission('articles', 'create'),
  articlesController.create
);

/**
 * @swagger
 * /api/articles/{id}:
 *   patch:
 *     summary: Update article
 *     tags: [Articles]
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
 *         description: Article updated
 */
router.patch(
  '/:id',
  requirePermission('articles', 'update'),
  articlesController.update
);

/**
 * @swagger
 * /api/articles/{id}:
 *   delete:
 *     summary: Delete article
 *     tags: [Articles]
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
 *         description: Article deleted
 */
router.delete(
  '/:id',
  requirePermission('articles', 'delete'),
  articlesController.delete
);

/**
 * @swagger
 * /api/articles/{id}/archive:
 *   post:
 *     summary: Archive article
 *     tags: [Articles]
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
 *         description: Article archived
 */
router.post(
  '/:id/archive',
  requirePermission('articles', 'archive'),
  articlesController.archive
);

/**
 * @swagger
 * /api/articles/{id}/unarchive:
 *   post:
 *     summary: Unarchive article
 *     tags: [Articles]
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
 *         description: Article unarchived
 */
router.post(
  '/:id/unarchive',
  requirePermission('articles', 'restore'),
  articlesController.unarchive
);

/**
 * @swagger
 * /api/articles/bulk-archive:
 *   post:
 *     summary: Bulk archive articles
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: UpdateMany result
 */
router.post(
  '/bulk-archive',
  requirePermission('articles', 'archive'),
  articlesController.bulkArchive
);

export default router;
