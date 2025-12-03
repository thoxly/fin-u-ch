import type { ParsedDocument } from '../types/imports';
import crypto from 'crypto';

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

  // Always try Web Crypto API first (available in browsers and Node.js 15+)
  // This ensures we never try to import Node.js crypto module in browser
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    globalThis.crypto &&
    typeof globalThis.crypto === 'object' &&
    'subtle' in globalThis.crypto &&
    typeof globalThis.crypto.subtle !== 'undefined'
  ) {
    // Browser or Node.js with Web Crypto API - use Web Crypto API
    try {
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
    } catch (error) {
      // If Web Crypto API fails, fall through to Node.js crypto (only in Node.js)
    }
  }

  // Node.js environment only - use Function constructor to hide require from Vite
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any;
  if (typeof global.process !== 'undefined' && global.process.versions?.node) {
    try {
      // Use Function constructor to completely hide require from static analysis
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const getRequire = new Function(
        'moduleName',
        'return require(moduleName);'
      );
      const crypto = getRequire('crypto');
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      throw new Error(
        `Unable to create hash: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  throw new Error('Unable to create hash: crypto API not available');
}

/**
 * Synchronous version for Node.js only.
 * Use createOperationHashAsync for browser compatibility.
 *
 * WARNING: This function will throw an error in browser environments.
 * Use createOperationHashAsync instead for cross-platform compatibility.
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

  // Check if we're in Node.js environment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const global = globalThis as any;
  if (typeof global.process === 'undefined' || !global.process.versions?.node) {
    throw new Error(
      'createOperationHash is only available in Node.js. Use createOperationHashAsync for browser compatibility.'
    );
  }

  // Use the imported crypto module directly
  try {
    // In Node.js environment, use the imported crypto module
    if (
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node
    ) {
      // Use the imported crypto module directly
      return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Fallback: try to use the imported crypto module anyway
    return crypto.createHash('sha256').update(data).digest('hex');
  } catch (error) {
    throw new Error(
      `Failed to create hash: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
}
