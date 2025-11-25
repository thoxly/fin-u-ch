import logger from '../../../config/logger';

export interface BatchProcessorOptions<TResult> {
  context?: string;
  continueOnError?: boolean;
  onBatchError?: (batchNumber: number, error: unknown) => void;
  onBatchComplete?: (batchNumber: number, results: TResult[]) => void;
}

/**
 * Utility class for processing items in batches
 */
export class BatchProcessor<TItem, TResult> {
  private batchSize: number;

  constructor(batchSize: number) {
    this.batchSize = batchSize;
  }

  /**
   * Processes items in batches
   */
  async processBatches(
    items: TItem[],
    processor: (batch: TItem[], batchNumber: number) => Promise<TResult[]>,
    options?: BatchProcessorOptions<TResult>
  ): Promise<TResult[]> {
    const allResults: TResult[] = [];
    const batches: TItem[][] = [];

    // Split items into batches
    for (let i = 0; i < items.length; i += this.batchSize) {
      batches.push(items.slice(i, i + this.batchSize));
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchNumber = batchIndex + 1;

      try {
        const results = await processor(batch, batchNumber);
        allResults.push(...results);

        if (options?.onBatchComplete) {
          options.onBatchComplete(batchNumber, results);
        }

        if (options?.context) {
          logger.debug(`Batch ${batchNumber}/${batches.length} completed`, {
            context: options.context,
            batchSize: batch.length,
            resultsCount: results.length,
          });
        }
      } catch (error) {
        if (options?.onBatchError) {
          options.onBatchError(batchNumber, error);
        } else {
          logger.error(`Batch ${batchNumber} failed`, {
            context: options?.context,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        if (!options?.continueOnError) {
          throw error;
        }
      }
    }

    return allResults;
  }
}
