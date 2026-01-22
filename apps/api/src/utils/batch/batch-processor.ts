import { Prisma } from '@prisma/client';
import prisma from '../../config/db';
import logger from '../../config/logger';
import { BatchProcessorOptions, BatchResult } from './batch.types';

/**
 * Универсальный процессор батчей для работы с транзакциями Prisma
 */
export class BatchProcessor<TItem, TResult> {
  private defaultOptions: Required<BatchProcessorOptions<TItem>> = {
    batchSize: 50,
    maxWait: 30000, // 30 секунд
    timeout: 300000, // 5 минут
    onItemError: (item, error, index) => {
      logger.error('Batch item processing error', {
        index,
        error: error.message,
        stack: error.stack,
      });
    },
    onBatchError: (batch, error, batchIndex) => {
      logger.error('Batch processing error', {
        batchIndex,
        batchSize: batch.length,
        error: error.message,
        stack: error.stack,
      });
    },
  };

  /**
   * Обрабатывает массив элементов батчами в транзакциях
   */
  async processBatches(
    items: TItem[],
    processor: (item: TItem, tx: Prisma.TransactionClient) => Promise<TResult>,
    options?: BatchProcessorOptions<TItem>
  ): Promise<BatchResult<TResult>> {
    const opts = { ...this.defaultOptions, ...options };
    const batches: TItem[][] = [];
    const results: TResult[] = [];
    const errorMessages: string[] = [];
    let success = 0;
    let errors = 0;

    // Разбиваем на батчи
    for (let i = 0; i < items.length; i += opts.batchSize) {
      batches.push(items.slice(i, i + opts.batchSize));
    }

    // Обрабатываем каждый батч
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        await prisma.$transaction(
          async (tx) => {
            for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
              const item = batch[itemIndex];
              const globalIndex = batchIndex * opts.batchSize + itemIndex;

              try {
                const result = await processor(item, tx);
                results.push(result);
                success++;
              } catch (error) {
                errors++;
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                errorMessages.push(`Item ${globalIndex}: ${errorMessage}`);

                if (opts.onItemError) {
                  opts.onItemError(item, error as Error, globalIndex);
                }
              }
            }
          },
          {
            maxWait: opts.maxWait,
            timeout: opts.timeout,
          }
        );
      } catch (error) {
        // Ошибка на уровне батча
        errors += batch.length;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errorMessages.push(`Batch ${batchIndex}: ${errorMessage}`);

        if (opts.onBatchError) {
          opts.onBatchError(batch, error as Error, batchIndex);
        }
      }
    }

    return {
      success,
      errors,
      results,
      errorMessages: errorMessages.length > 0 ? errorMessages : undefined,
    };
  }
}
