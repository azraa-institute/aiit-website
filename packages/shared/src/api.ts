/** Mirrors apps/api's AllExceptionsFilter exactly -- keep the two in sync. */
export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
