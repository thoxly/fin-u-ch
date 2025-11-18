import type { ParsedDocument } from '../types/imports';

/**
 * Creates a stable SHA-256 hash from a ParsedDocument to uniquely identify an operation.
 * The hash is based on key fields that define the uniqueness of a bank transaction.
 * Normalizes data to ensure consistency (e.g., trims strings, formats date and amount).
 *
 * Works in both Node.js (using crypto module) and browser (using Web Crypto API).
 *
 * @param doc - The parsed document object.
 * @returns A SHA-256 hash as a hex string.
 */
export async function createOperationHashAsync(
  doc: ParsedDocument
): Promise<string> {
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

  // Use Web Crypto API in browser, Node.js crypto in Node.js
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    globalThis.crypto &&
    typeof globalThis.crypto === 'object' &&
    'subtle' in globalThis.crypto
  ) {
    // Browser environment - use Web Crypto API
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const crypto = globalThis.crypto as {
      subtle: {
        digest(
          algorithm: string,
          data: ArrayBuffer | ArrayBufferView
        ): Promise<ArrayBuffer>;
      };
    };
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    const { createHash } = await import('crypto');
    return createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Synchronous version for Node.js only.
 * Use createOperationHashAsync for browser compatibility.
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

  // Only works in Node.js
  if (typeof globalThis === 'undefined' || !('window' in globalThis)) {
    // Dynamic import to avoid bundling crypto in browser
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Fallback for browser (should not be used, but provides a sync interface)
  throw new Error(
    'createOperationHash is not available in browser. Use createOperationHashAsync instead.'
  );
}
