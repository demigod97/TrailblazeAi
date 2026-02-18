// Response envelope helpers
// Standardized response creation

import type { ApiSuccess, ApiErrorResponse, ApiErrorBody } from '../types/api.js';

export function success<T>(data: T): ApiSuccess<T> {
  return {
    data,
    error: null,
  };
}

export function error(
  code: string,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  const errorBody: ApiErrorBody = {
    code,
    message,
  };

  if (details !== undefined) {
    errorBody.details = details;
  }

  return {
    data: null,
    error: errorBody,
  };
}
