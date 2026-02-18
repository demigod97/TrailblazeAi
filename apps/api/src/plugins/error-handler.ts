import type { FastifyInstance, FastifyError } from 'fastify';
import { AppError } from '../lib/errors.js';
import { error } from '../lib/response.js';
import type { ApiErrorResponse } from '../types/api.js';

export function errorHandlerSetup(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError | AppError | Error, _request, reply) => {
    if (err instanceof AppError) {
      const response: ApiErrorResponse = error(err.code, err.message, err.details);
      return reply.status(err.status_code).send(response);
    }

    // Handle Fastify errors
    if ('statusCode' in err) {
      const statusCode = (err as FastifyError).statusCode ?? 500;
      const response: ApiErrorResponse = error(
        'INTERNAL_SERVER_ERROR',
        err.message ?? 'Internal server error',
      );
      return reply.status(statusCode).send(response);
    }

    // Default error handling for regular Error objects
    const response: ApiErrorResponse = error(
      'INTERNAL_SERVER_ERROR',
      err.message ?? 'Internal server error',
    );
    return reply.status(500).send(response);
  });
}
