import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import importsService from './imports.service';
import logger from '../../config/logger';

export class ImportsController {
  async uploadStatement(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;

      if (!file) {
        logger.warn('Upload statement request without file', {
          companyId: req.companyId,
          userId: req.userId,
          ip: req.ip,
        });
        return res.status(400).json({ error: 'File is required' });
      }

      logger.info('Upload statement request', {
        companyId: req.companyId,
        userId: req.userId,
        fileName: file.originalname,
        fileSize: file.size,
        ip: req.ip,
      });

      const result = await importsService.uploadStatement(
        req.companyId!,
        req.userId!,
        file.originalname,
        file.buffer
      );

      logger.info('Statement uploaded successfully', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId: result.sessionId,
        importedCount: result.importedCount,
        duplicatesCount: result.duplicatesCount,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to upload statement', {
        companyId: req.companyId,
        userId: req.userId,
        fileName: req.file?.originalname,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getImportedOperations(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sessionId } = req.params;
      const confirmed = req.query.confirmed
        ? req.query.confirmed === 'true'
        : undefined;
      const matched = req.query.matched
        ? req.query.matched === 'true'
        : undefined;
      const processed = req.query.processed
        ? req.query.processed === 'true'
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      logger.debug('Get imported operations request', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
        filters: { confirmed, matched, processed },
        limit,
        offset,
      });

      const result = await importsService.getImportedOperations(
        sessionId,
        req.companyId!,
        {
          confirmed,
          matched,
          processed,
          limit,
          offset,
        }
      );

      logger.debug('Imported operations retrieved successfully', {
        companyId: req.companyId,
        sessionId,
        operationsCount: result.operations.length,
        total: result.total,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get imported operations', {
        companyId: req.companyId,
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async updateImportedOperation(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Update imported operation request', {
        companyId: req.companyId,
        userId: req.userId,
        operationId: req.params.id,
        sessionId: req.body.sessionId,
        ip: req.ip,
      });

      const { id } = req.params;
      const result = await importsService.updateImportedOperation(
        id,
        req.companyId!,
        req.body
      );

      logger.info('Imported operation updated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        operationId: id,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to update imported operation', {
        companyId: req.companyId,
        operationId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async bulkUpdateImportedOperations(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sessionId } = req.params;
      const { operationIds, ...data } = req.body;

      if (!operationIds || !Array.isArray(operationIds)) {
        logger.warn(
          'Bulk update imported operations with invalid operationIds',
          {
            companyId: req.companyId,
            userId: req.userId,
            sessionId,
            ip: req.ip,
          }
        );
        return res.status(400).json({ error: 'operationIds must be an array' });
      }

      logger.info('Bulk update imported operations request', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
        operationsCount: operationIds.length,
        ip: req.ip,
      });

      const result = await importsService.bulkUpdateImportedOperations(
        sessionId,
        req.companyId!,
        operationIds,
        data
      );

      logger.info('Imported operations bulk updated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
        updatedCount: operationIds.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to bulk update imported operations', {
        companyId: req.companyId,
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async applyRules(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Apply mapping rules request', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId: req.params.sessionId,
        ip: req.ip,
      });

      const { sessionId } = req.params;
      const result = await importsService.applyRules(sessionId, req.companyId!);

      logger.info('Mapping rules applied successfully', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
        appliedCount: result.applied,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to apply mapping rules', {
        companyId: req.companyId,
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async importOperations(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { sessionId } = req.params;
      const { operationIds, saveRulesForIds } = req.body;

      logger.info('Import operations request', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
        operationsCount: operationIds?.length || 0,
        saveRulesForIdsCount: saveRulesForIds?.length || 0,
        ip: req.ip,
      });

      const result = await importsService.importOperations(
        sessionId,
        req.companyId!,
        req.userId!,
        operationIds,
        saveRulesForIds
      );

      logger.info('Operations imported successfully', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
        importedCount: result.imported,
        errorsCount: result.errorMessages?.length || 0,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to import operations', {
        companyId: req.companyId,
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getImportSession(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.debug('Get import session request', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId: req.params.sessionId,
      });

      const { sessionId } = req.params;
      const result = await importsService.getImportSession(
        sessionId,
        req.companyId!
      );

      logger.debug('Import session retrieved successfully', {
        companyId: req.companyId,
        sessionId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get import session', {
        companyId: req.companyId,
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async deleteSession(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.info('Delete import session request', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId: req.params.sessionId,
        ip: req.ip,
      });

      const { sessionId } = req.params;
      const result = await importsService.deleteSession(
        sessionId,
        req.companyId!
      );

      logger.info('Import session deleted successfully', {
        companyId: req.companyId,
        userId: req.userId,
        sessionId,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to delete import session', {
        companyId: req.companyId,
        sessionId: req.params.sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getMappingRules(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      logger.debug('Get mapping rules request', {
        companyId: req.companyId,
        userId: req.userId,
        targetType: req.query.targetType,
        sourceField: req.query.sourceField,
      });

      const targetType = req.query.targetType as string | undefined;
      const sourceField = req.query.sourceField as string | undefined;

      const result = await importsService.getMappingRules(req.companyId!, {
        targetType,
        sourceField,
      });

      logger.debug('Mapping rules retrieved successfully', {
        companyId: req.companyId,
        rulesCount: result.length,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get mapping rules', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async createMappingRule(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Create mapping rule request', {
        companyId: req.companyId,
        userId: req.userId,
        targetType: req.body.targetType,
        sourceField: req.body.sourceField,
        ip: req.ip,
      });

      const result = await importsService.createMappingRule(
        req.companyId!,
        req.userId!,
        req.body
      );

      logger.info('Mapping rule created successfully', {
        companyId: req.companyId,
        userId: req.userId,
        ruleId: result.id,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error('Failed to create mapping rule', {
        companyId: req.companyId,
        userId: req.userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async updateMappingRule(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Update mapping rule request', {
        companyId: req.companyId,
        userId: req.userId,
        ruleId: req.params.id,
        ip: req.ip,
      });

      const { id } = req.params;
      const result = await importsService.updateMappingRule(
        id,
        req.companyId!,
        req.body
      );

      logger.info('Mapping rule updated successfully', {
        companyId: req.companyId,
        userId: req.userId,
        ruleId: id,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to update mapping rule', {
        companyId: req.companyId,
        ruleId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async deleteMappingRule(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.info('Delete mapping rule request', {
        companyId: req.companyId,
        userId: req.userId,
        ruleId: req.params.id,
        ip: req.ip,
      });

      const { id } = req.params;
      await importsService.deleteMappingRule(id, req.companyId!);

      logger.info('Mapping rule deleted successfully', {
        companyId: req.companyId,
        userId: req.userId,
        ruleId: id,
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete mapping rule', {
        companyId: req.companyId,
        ruleId: req.params.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  // TODO: Frontend компонент ImportHistory не создан
  // Backend endpoint готов, но требуется UI для отображения истории
  // См. ТЗ: раздел "Frontend: UI компоненты" → "5. История импортов"
  async getImportSessions(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.debug('Get import sessions request', {
        companyId: req.companyId,
        userId: req.userId,
        status: req.query.status,
        limit: req.query.limit,
        offset: req.query.offset,
      });

      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const result = await importsService.getImportSessions(req.companyId!, {
        status,
        limit,
        offset,
      });

      logger.debug('Import sessions retrieved successfully', {
        companyId: req.companyId,
        sessionsCount: result.sessions.length,
        total: result.total,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to get import sessions', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }

  async getTotalImportedOperationsCount(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      logger.debug('Get total imported operations count request', {
        companyId: req.companyId,
        userId: req.userId,
      });

      const count = await importsService.getTotalImportedOperationsCount(
        req.companyId!
      );

      logger.debug('Total imported operations count retrieved', {
        companyId: req.companyId,
        count,
      });

      res.json({ count });
    } catch (error) {
      logger.error('Failed to get total imported operations count', {
        companyId: req.companyId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      next(error);
    }
  }
}

export default new ImportsController();
