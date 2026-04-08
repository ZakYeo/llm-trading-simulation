import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';

import { DomainInvariantError } from '../../domain/errors/domain-invariant.error.js';

interface HttpResponseLike {
  status(code: number): {
    json(body: unknown): void;
  };
}

@Catch(ZodError, DomainInvariantError)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: ZodError | DomainInvariantError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<HttpResponseLike>();

    if (exception instanceof ZodError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Request validation failed.',
        details: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    const statusCode = exception.message.toLowerCase().includes('not found')
      ? HttpStatus.NOT_FOUND
      : HttpStatus.BAD_REQUEST;

    response.status(statusCode).json({
      statusCode,
      error: statusCode === HttpStatus.NOT_FOUND ? 'Not Found' : 'Bad Request',
      message: exception.message,
    });
  }
}
