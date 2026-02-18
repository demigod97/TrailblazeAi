// API response envelope types
// All API responses follow this shape (no exceptions)

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  data: null;
  error: ApiErrorBody;
}

// ApiError is the canonical name used in story ACs and architecture.md
export type ApiError = ApiErrorResponse;

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
