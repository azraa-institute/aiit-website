import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

/**
 * pino-http already assigns req.id (see app.module.ts's genReqId). This just
 * surfaces it back to the client as a response header, per the logging
 * convention: "a request ID that is also returned to the client."
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { id?: string }>();
    const response = httpContext.getResponse<Response>();

    if (request?.id) {
      response.setHeader('x-request-id', request.id);
    }

    return next.handle();
  }
}
