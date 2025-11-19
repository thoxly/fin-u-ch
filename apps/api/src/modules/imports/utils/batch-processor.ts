import logger from '../../../config/logger';

/**
 * Batch processor utility for processing large datasets in chunks
 */
export class BatchProcessor<T, R> {
  private readonly batchSize: number;

  constructor(batchSize: number = 100) {
    this.batchSize = batchSize;
  }

  /**
   * Разбивает массив на батчи
   */
  createBatches(items: T[]): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }
    return batches;
  }

  /**
   * Обрабатывает батчи последовательно
   */
  async processBatches(
    items: T[],
    processor: (batch: T[], batchNumber: number) => Promise<R[]>,
    options?: {
      onBatchComplete?: (batchNumber: number, results: R[]) => void;
      onBatchError?: (batchNumber: number, error: unknown) => void;
      continueOnError?: boolean;
      context?: string;
    }
  ): Promise<R[]> {
    const batches = this.createBatches(items);
    const allResults: R[] = [];
    let batchNumber = 0;

    logger.info('Starting batch processing', {
      context: options?.context,
      totalItems: items.length,
      totalBatches: batches.length,
      batchSize: this.batchSize,
    });

    for (const batch of batches) {
      batchNumber++;
      try {
        const results = await processor(batch, batchNumber);
        allResults.push(...results);

        if (options?.onBatchComplete) {
          options.onBatchComplete(batchNumber, results);
        }

        logger.debug('Batch processed successfully', {
          context: options?.context,
          batchNumber,
          batchSize: batch.length,
          totalProcessed: allResults.length,
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error('Failed to process batch', {
          context: options?.context,
          batchNumber,
          batchSize: batch.length,
          error: errorMessage,
          stack: errorStack,
        });

        if (options?.onBatchError) {
          options.onBatchError(batchNumber, error);
        }

        // Если не указано продолжать при ошибке, выбрасываем исключение
        if (!options?.continueOnError) {
          throw error;
        }
      }
    }

    logger.info('Batch processing completed', {
      context: options?.context,
      totalBatches: batches.length,
      totalProcessed: allResults.length,
    });

    return allResults;
  }

  /**
   * Обрабатывает батчи параллельно с ограничением одновременных задач
   */
  async processBatchesParallel(
    items: T[],
    processor: (batch: T[], batchNumber: number) => Promise<R[]>,
    options?: {
      maxConcurrent?: number;
      onBatchComplete?: (batchNumber: number, results: R[]) => void;
      onBatchError?: (batchNumber: number, error: unknown) => void;
      continueOnError?: boolean;
      context?: string;
    }
  ): Promise<R[]> {
    const batches = this.createBatches(items);
    const maxConcurrent = options?.maxConcurrent || 3;
    const allResults: R[] = [];

    logger.info('Starting parallel batch processing', {
      context: options?.context,
      totalItems: items.length,
      totalBatches: batches.length,
      batchSize: this.batchSize,
      maxConcurrent,
    });

    // Обрабатываем батчи с ограничением одновременных задач
    for (let i = 0; i < batches.length; i += maxConcurrent) {
      const batchGroup = batches.slice(i, i + maxConcurrent);
      const promises = batchGroup.map((batch, index) => {
        const batchNumber = i + index + 1;
        return processor(batch, batchNumber)
          .then((results) => {
            if (options?.onBatchComplete) {
              options.onBatchComplete(batchNumber, results);
            }
            logger.debug('Batch processed successfully', {
              context: options?.context,
              batchNumber,
              batchSize: batch.length,
            });
            return results;
          })
          .catch((error: unknown) => {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;

            logger.error('Failed to process batch', {
              context: options?.context,
              batchNumber,
              batchSize: batch.length,
              error: errorMessage,
              stack: errorStack,
            });

            if (options?.onBatchError) {
              options.onBatchError(batchNumber, error);
            }

            if (!options?.continueOnError) {
              throw error;
            }
            return [] as R[];
          });
      });

      const results = await Promise.all(promises);
      allResults.push(...results.flat());
    }

    logger.info('Parallel batch processing completed', {
      context: options?.context,
      totalBatches: batches.length,
      totalProcessed: allResults.length,
    });

    return allResults;
  }
}

/**
 * Creates a batch processor with default size
 */
export function createBatchProcessor<T, R>(
  batchSize?: number
): BatchProcessor<T, R> {
  return new BatchProcessor<T, R>(batchSize);
}
