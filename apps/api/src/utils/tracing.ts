import { trace, Span, context } from '@opentelemetry/api';

/**
 * Helper function to create a span for async operations
 */
export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = trace.getTracer('fin-u-ch-api');
  const span = tracer.startSpan(name, {
    attributes,
  });

  try {
    const result = await context.with(
      trace.setSpan(context.active(), span),
      async () => {
        return await fn(span);
      }
    );
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span.setStatus({
      code: 2,
      message: error instanceof Error ? error.message : String(error),
    }); // ERROR
    span.recordException(
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  } finally {
    span.end();
  }
}
