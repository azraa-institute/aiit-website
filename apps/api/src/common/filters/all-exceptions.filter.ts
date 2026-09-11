import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Every unhandled exception in the API funnels through here into one envelope shape. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body: ErrorEnvelope = isHttp
      ? {
          error: {
            code: HttpStatus[status] ?? 'ERROR',
            message: exception.message,
            details: extractDetails(exception.getResponse()),
          },
        }
      : {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred.',
          },
        };

    this.logger.error({ requestId: request?.id, status, err: exception }, body.error.message);

    if (!isHttp || status >= 500) {
      Sentry.captureException(exception);
    }

    response.status(status).json(body);
  }
}

function extractDetails(response: string | object): unknown {
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const { message } = response as { message: unknown };
    return Array.isArray(message) ? message : undefined;
  }
  return undefined;
}
