// Error hierarchy
// All errors extend AppError and map to HTTP status codes

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status_code: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class PipelineError extends AppError {
  constructor(stage: string, message: string, details?: unknown) {
    super('PIPELINE_ERROR', `${stage}: ${message}`, 500, details);
    Object.setPrototypeOf(this, PipelineError.prototype);
  }
}

export class SessionExpiredError extends AppError {
  constructor(message = 'Trailhead session has expired') {
    super('SESSION_EXPIRED', message, 503);
    Object.setPrototypeOf(this, SessionExpiredError.prototype);
  }
}
