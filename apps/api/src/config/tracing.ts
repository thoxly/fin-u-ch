import { env } from './env';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdk: any = null;

// Initialize OpenTelemetry SDK
export function initializeTracing(): void {
  // Only initialize in production or if explicitly enabled
  if (env.NODE_ENV !== 'production' && !process.env.ENABLE_TRACING) {
    return;
  }

  try {
    // Dynamic import to avoid version conflicts
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NodeSDK } = require('@opentelemetry/sdk-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      getNodeAutoInstrumentations,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    } = require('@opentelemetry/auto-instrumentations-node');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Resource } = require('@opentelemetry/resources');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      SemanticResourceAttributes,
      // eslint-disable-next-line @typescript-eslint/no-var-requires
    } = require('@opentelemetry/semantic-conventions');

    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'fin-u-ch-api',
        [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
      }),
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://tempo:4318',
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation to reduce noise
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    sdk.start();
    // eslint-disable-next-line no-console
    console.log('OpenTelemetry tracing initialized');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to initialize OpenTelemetry tracing:', error);
  }
}

// Graceful shutdown
export function shutdownTracing(): Promise<void> {
  if (sdk) {
    return sdk.shutdown();
  }
  return Promise.resolve();
}
