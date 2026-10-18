import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { DataIntegrityError } from './data-integrity.error';

@Catch(DataIntegrityError)
export class DataIntegrityExceptionFilter implements ExceptionFilter<DataIntegrityError> {
  private readonly logger = new Logger(DataIntegrityExceptionFilter.name);

  catch(exception: DataIntegrityError, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    this.logger.error(`${request.method} ${request.url}: ${exception.message}`);
    response.status(500).json({ statusCode: 500, message: exception.message });
  }
}