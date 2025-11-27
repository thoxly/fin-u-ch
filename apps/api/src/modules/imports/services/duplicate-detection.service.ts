import prisma from '../../../config/db';
import logger from '../../../config/logger';
import type { ParsedDocument } from '@fin-u-ch/shared';

export interface DuplicateCheckResult {
  duplicatesCount: number;
  duplicateHashes: Set<string>;
}

/**
 * Service for detecting duplicate operations
 */
class DuplicateDetectionService {
  /**
   * Checks for duplicates by hash
   * Compares operations by their hash to detect duplicates
   */
  async checkDuplicatesByHash(
    companyId: string,
    documents: ParsedDocument[]
  ): Promise<DuplicateCheckResult> {
    const duplicateHashes = new Set<string>();
    let duplicatesCount = 0;

    // Extract hashes from documents (if they have hash property)
    const documentHashes = documents
      .map((doc) => (doc as any).hash)
      .filter((hash): hash is string => typeof hash === 'string');

    if (documentHashes.length === 0) {
      return { duplicatesCount: 0, duplicateHashes };
    }

    // Check in imported_operations table
    // Note: hash field doesn't exist in schema, so we check by date, amount, and description
    const existingImportedOps = await prisma.importedOperation.findMany({
      where: {
        companyId,
        processed: false,
        date: {
          in: documents.map((doc) => doc.date),
        },
        amount: {
          in: documents.map((doc) => doc.amount),
        },
      },
      select: {
        id: true,
        date: true,
        amount: true,
        description: true,
      },
    });

    // Check in operations table (for already imported operations)
    // Note: operations table might not have hash field, so we check by date, amount, and description
    const existingOps = await prisma.operation.findMany({
      where: {
        companyId,
        operationDate: {
          in: documents.map((doc) => doc.date),
        },
        amount: {
          in: documents.map((doc) => doc.amount),
        },
      },
      select: {
        id: true,
        operationDate: true,
        amount: true,
        description: true,
      },
    });

    // Check each document for duplicates
    for (const doc of documents) {
      const docHash = (doc as any).hash;
      if (!docHash) continue;

      // Check in imported_operations (by date, amount, and description)
      const foundInImported = existingImportedOps.some((op) => {
        const dateMatch =
          Math.abs(op.date.getTime() - doc.date.getTime()) /
            (1000 * 60 * 60 * 24) <=
          2; // Within 2 days
        const amountMatch = op.amount === doc.amount;
        const descriptionMatch =
          doc.purpose &&
          op.description &&
          op.description.substring(0, 50) === doc.purpose.substring(0, 50);

        return dateMatch && amountMatch && descriptionMatch;
      });

      // Check in operations (by date, amount, and description prefix)
      const foundInOperations = existingOps.some((op) => {
        const dateMatch =
          Math.abs(op.operationDate.getTime() - doc.date.getTime()) /
            (1000 * 60 * 60 * 24) <=
          2; // Within 2 days
        const amountMatch = op.amount === doc.amount;
        const descriptionMatch =
          doc.purpose &&
          op.description &&
          op.description.substring(0, 50) === doc.purpose.substring(0, 50);

        return dateMatch && amountMatch && descriptionMatch;
      });

      if (foundInImported || foundInOperations) {
        duplicateHashes.add(docHash);
        duplicatesCount++;
      }
    }

    logger.info('Duplicate check completed', {
      companyId,
      totalDocuments: documents.length,
      duplicatesCount,
    });

    return { duplicatesCount, duplicateHashes };
  }
}

export default new DuplicateDetectionService();
