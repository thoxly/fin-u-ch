import { createHash } from 'crypto';
import type { ParsedDocument } from '../types/imports';

/**
 * Creates a stable SHA-256 hash from a ParsedDocument to uniquely identify an operation.
 * The hash is based on key fields that define the uniqueness of a bank transaction.
 * Normalizes data to ensure consistency (e.g., trims strings, formats date and amount).
 *
 * @param doc - The parsed document object.
 * @returns A SHA-256 hash as a hex string.
 */
export function createOperationHash(doc: ParsedDocument): string {
  // Normalize and concatenate key fields into a stable string
  const data = [
    // Format date to 'YYYY-MM-DD' to avoid timezone issues
    doc.date.toISOString().slice(0, 10),
    // Format amount to 2 decimal places
    doc.amount.toFixed(2),
    // Use trimmed, non-null values for other fields
    doc.number?.trim() ?? '',
    doc.payer?.trim() ?? '',
    doc.payerInn?.trim() ?? '',
    doc.payerAccount?.trim() ?? '',
    doc.receiver?.trim() ?? '',
    doc.receiverInn?.trim() ?? '',
    doc.receiverAccount?.trim() ?? '',
    doc.purpose?.trim() ?? '',
  ].join('|'); // Use a separator to prevent field collision

  // Create a SHA-256 hash
  return createHash('sha256').update(data).digest('hex');
}
