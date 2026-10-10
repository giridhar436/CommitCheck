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

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? exception.getResponse() : null;

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
