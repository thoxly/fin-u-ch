import { Response, NextFunction } from 'express';
import { TenantRequest } from '../../middlewares/tenant';
import importsService from './imports.service';

export class ImportsController {
  async uploadStatement(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const result = await importsService.uploadStatement(
        req.companyId!,
        req.userId!,
        file.originalname,
        file.buffer
      );

      res.status(201).json(result);
    } catch (error) {
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
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset
        ? parseInt(req.query.offset as string)
        : 0;

      const result = await importsService.getImportedOperations(
        sessionId,
        req.companyId!,
        {
          confirmed,
          matched,
          limit,
          offset,
        }
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateImportedOperation(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await importsService.updateImportedOperation(
        id,
        req.companyId!,
        req.body
      );

      res.json(result);
    } catch (error) {
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
        return res.status(400).json({ error: 'operationIds must be an array' });
      }

      const result = await importsService.bulkUpdateImportedOperations(
        sessionId,
        req.companyId!,
        operationIds,
        data
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async applyRules(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const result = await importsService.applyRules(sessionId, req.companyId!);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async importOperations(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { operationIds, saveRulesForIds } = req.body;

      const result = await importsService.importOperations(
        sessionId,
        req.companyId!,
        req.userId!,
        operationIds,
        saveRulesForIds
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteSession(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const result = await importsService.deleteSession(
        sessionId,
        req.companyId!
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getMappingRules(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const targetType = req.query.targetType as string | undefined;
      const sourceField = req.query.sourceField as string | undefined;

      const result = await importsService.getMappingRules(req.companyId!, {
        targetType,
        sourceField,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createMappingRule(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const result = await importsService.createMappingRule(
        req.companyId!,
        req.userId!,
        req.body
      );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateMappingRule(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const result = await importsService.updateMappingRule(
        id,
        req.companyId!,
        req.body
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteMappingRule(
    req: TenantRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      await importsService.deleteMappingRule(id, req.companyId!);

      res.status(204).send();
    } catch (error) {
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

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export default new ImportsController();

