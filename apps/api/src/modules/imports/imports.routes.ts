import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import importsController from './imports.controller';

const router: Router = Router();

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Принимаем только .txt файлы
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'));
    }
  },
});

router.use(authenticate);
router.use(extractTenant);

/**
 * @swagger
 * /api/imports/upload:
 *   post:
 *     summary: Upload bank statement file
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file format
 */
router.post('/upload', upload.single('file'), importsController.uploadStatement);

/**
 * @swagger
 * /api/imports/sessions/{sessionId}/operations:
 *   get:
 *     summary: Get imported operations from session
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: confirmed
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: matched
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of imported operations
 */
router.get(
  '/sessions/:sessionId/operations',
  importsController.getImportedOperations
);

/**
 * @swagger
 * /api/imports/operations/{id}:
 *   patch:
 *     summary: Update imported operation
 *     tags: [Imports]
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
 *             properties:
 *               matchedArticleId:
 *                 type: string
 *               matchedCounterpartyId:
 *                 type: string
 *               matchedAccountId:
 *                 type: string
 *               confirmed:
 *                 type: boolean
 *               direction:
 *                 type: string
 *                 enum: [income, expense, transfer]
 *     responses:
 *       200:
 *         description: Operation updated
 */
router.patch(
  '/operations/:id',
  importsController.updateImportedOperation
);

/**
 * @swagger
 * /api/imports/sessions/{sessionId}/operations/bulk:
 *   patch:
 *     summary: Bulk update imported operations
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
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
 *               - operationIds
 *             properties:
 *               operationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               matchedArticleId:
 *                 type: string
 *               matchedCounterpartyId:
 *                 type: string
 *               matchedAccountId:
 *                 type: string
 *               confirmed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Operations updated
 */
router.patch(
  '/sessions/:sessionId/operations/bulk',
  importsController.bulkUpdateImportedOperations
);

/**
 * @swagger
 * /api/imports/sessions/{sessionId}/apply-rules:
 *   post:
 *     summary: Apply mapping rules to session
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rules applied
 */
router.post('/sessions/:sessionId/apply-rules', importsController.applyRules);

/**
 * @swagger
 * /api/imports/sessions/{sessionId}/import:
 *   post:
 *     summary: Import operations (create real operations)
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Operations imported
 */
router.post('/sessions/:sessionId/import', importsController.importOperations);

/**
 * @swagger
 * /api/imports/sessions/{sessionId}:
 *   delete:
 *     summary: Delete import session
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted
 */
router.delete('/sessions/:sessionId', importsController.deleteSession);

/**
 * @swagger
 * /api/imports/rules:
 *   get:
 *     summary: Get mapping rules
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *       - in: query
 *         name: sourceField
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of mapping rules
 *   post:
 *     summary: Create mapping rule
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ruleType
 *               - pattern
 *               - targetType
 *             properties:
 *               ruleType:
 *                 type: string
 *                 enum: [contains, equals, regex, alias]
 *               pattern:
 *                 type: string
 *               targetType:
 *                 type: string
 *                 enum: [article, counterparty, account, operationType]
 *               targetId:
 *                 type: string
 *               targetName:
 *                 type: string
 *               sourceField:
 *                 type: string
 *                 enum: [description, receiver, payer, inn]
 *     responses:
 *       201:
 *         description: Rule created
 */
router.get('/rules', importsController.getMappingRules);
router.post('/rules', importsController.createMappingRule);

/**
 * @swagger
 * /api/imports/rules/{id}:
 *   patch:
 *     summary: Update mapping rule
 *     tags: [Imports]
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
 *             properties:
 *               ruleType:
 *                 type: string
 *               pattern:
 *                 type: string
 *               targetType:
 *                 type: string
 *               targetId:
 *                 type: string
 *               targetName:
 *                 type: string
 *               sourceField:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rule updated
 *   delete:
 *     summary: Delete mapping rule
 *     tags: [Imports]
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
 *         description: Rule deleted
 */
router.patch('/rules/:id', importsController.updateMappingRule);
router.delete('/rules/:id', importsController.deleteMappingRule);

/**
 * @swagger
 * /api/imports/sessions:
 *   get:
 *     summary: Get import sessions history
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of import sessions
 */
router.get('/sessions', importsController.getImportSessions);

export default router;

