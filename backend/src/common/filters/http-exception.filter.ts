import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * Global exception filter — guarantees the `{ success, message, error }`
 * error envelope for every failure path (HttpException or unexpected).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    // body-parser rejects oversized request bodies before routing; Nest
    // surfaces these as plain errors — map them to 413, not a 500.
    const bodyError = exception as { type?: string; status?: number; statusCode?: number; message?: string };
    const isEntityTooLarge =
      bodyError?.type === 'entity.too.large' ||
      bodyError?.status === 413 ||
      bodyError?.statusCode === 413;

    const isHttp = exception instanceof HttpException;
    let status: number;
    let payload: unknown;

    if (isEntityTooLarge) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      payload = { message: 'Request body too large' };
    } else if (isHttp) {
      status = exception.getStatus();
      payload = exception.getResponse();
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      payload = null;
    }

    // ValidationPipe errors arrive as { message: string[]; error: string; statusCode }.
    const rawMessage =
      typeof payload === 'object' && payload !== null
        ? ((payload as Record<string, unknown>).message ?? exception)
        : (payload ?? exception);

    let message: string;
    let error: unknown;

    if (Array.isArray(rawMessage)) {
      message = 'Validation failed';
      error = rawMessage;
    } else if (typeof rawMessage === 'string') {
      message = rawMessage;
      error = null;
    } else {
      message =
        (rawMessage as { message?: string })?.message ??
        'Internal server error';
      error =
        (rawMessage as { error?: unknown })?.error ??
        (status >= 500 ? null : null);
    }

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json({ success: false, message, error });
  }
}
