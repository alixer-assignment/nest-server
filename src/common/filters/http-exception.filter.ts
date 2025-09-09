import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
    }

    // Log the error
    this.logError(exception, request, status);

    // Prepare error response
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Send response
    response.status(status).json(errorResponse);
  }

  private async logError(
    exception: unknown,
    request: Request,
    status: number,
  ): Promise<void> {
    try {
      const userId = (request as any).user?.sub || (request as any).user?._id;
      const ip = request.ip || request.connection.remoteAddress;
      const userAgent = request.get('User-Agent');

      // Log security events for specific status codes
      if (status === HttpStatus.UNAUTHORIZED) {
        this.logger.warn(
          `Unauthorized access attempt: ${request.method} ${request.url} - User: ${userId} - IP: ${ip}`,
        );
      } else if (status === HttpStatus.FORBIDDEN) {
        this.logger.warn(
          `Forbidden access attempt: ${request.method} ${request.url} - User: ${userId} - IP: ${ip}`,
        );
      } else if (status >= 500) {
        this.logger.error(
          `Server error: ${request.method} ${request.url} - Status: ${status}`,
          exception instanceof Error ? exception.stack : exception,
        );
      }

      // Log all errors
      this.logger.error(
        `HTTP ${status} Error: ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } catch (logError) {
      this.logger.error('Failed to log error:', logError);
    }
  }
}
