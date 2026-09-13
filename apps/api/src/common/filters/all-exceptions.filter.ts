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
            // ValidationPipe throws a bare BadRequestException whose own
            // .message is the unhelpful generic "Bad Request Exception" --
            // the actual per-field messages ("email must be an email")
            // only exist in its response body's `message` array, otherwise
            // surfaced solely via `details` below, which callers (the
            // frontend's ApiError) never read. Prefer that array, joined,
            // whenever it's there.
            message: readableMessage(exception),
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

function readableMessage(exception: HttpException): string {
  const details = extractDetails(exception.getResponse());
  if (Array.isArray(details) && details.length > 0 && details.every((d) => typeof d === 'string')) {
    return (details as string[]).join(' ');
  }
  return exception.message;
}
