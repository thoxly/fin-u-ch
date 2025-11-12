import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { extractTenant } from '../../middlewares/tenant';
import { requirePermission } from '../../middlewares/permissions';
import auditLogController from './audit.controller';

const router = Router();

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Получить логи действий с фильтрацией
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: ID пользователя
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Тип сущности (operation, budget, article, etc.)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: ID сущности
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Тип действия (create, update, delete, etc.)
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Начальная дата
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Конечная дата
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Количество записей
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Смещение
 *     responses:
 *       200:
 *         description: Список логов
 */
router.get(
  '/',
  authenticate,
  extractTenant,
  requirePermission('audit', 'read'),
  auditLogController.getLogs
);

/**
 * @swagger
 * /api/audit-logs/entity/{entity}/{entityId}:
 *   get:
 *     summary: Получить логи для конкретной сущности
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список логов для сущности
 */
router.get(
  '/entity/:entity/:entityId',
  authenticate,
  extractTenant,
  requirePermission('audit', 'read'),
  auditLogController.getEntityLogs
);

/**
 * @swagger
 * /api/audit-logs/user/{userId}:
 *   get:
 *     summary: Получить логи пользователя
 *     tags: [Audit Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Список логов пользователя
 */
router.get(
  '/user/:userId',
  authenticate,
  extractTenant,
  requirePermission('audit', 'read'),
  auditLogController.getUserLogs
);

export default router;
