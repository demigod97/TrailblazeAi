import { describe, it, expect } from 'vitest';
import { AppError, NotFoundError, ValidationError, PipelineError } from './errors.js';

describe('Error Hierarchy', () => {
  describe('AppError', () => {
    it('should create an AppError with correct properties', () => {
      const error = new AppError('TEST_ERROR', 'test message', 500, { extra: 'data' });
      expect(error.name).toBe('AppError');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('test message');
      expect(error.status_code).toBe(500);
      expect(error.details).toEqual({ extra: 'data' });
    });

    it('should default status_code to 500', () => {
      const error = new AppError('TEST', 'message');
      expect(error.status_code).toBe(500);
    });

    it('should extend Error class', () => {
      const error = new AppError('TEST', 'message');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create a NotFoundError with 404 status', () => {
      const error = new NotFoundError('Module', 'abc123');
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('Module with id abc123 not found');
      expect(error.status_code).toBe(404);
    });

    it('should be an instanceof AppError', () => {
      const error = new NotFoundError('User', 'user-1');
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.message).toBe('Invalid input');
      expect(error.status_code).toBe(400);
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ValidationError('Invalid email', details);
      expect(error.details).toEqual(details);
    });

    it('should be an instanceof AppError', () => {
      const error = new ValidationError('Test');
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('PipelineError', () => {
    it('should create a PipelineError with 500 status', () => {
      const error = new PipelineError('scraping', 'Failed to scrape module');
      expect(error.name).toBe('PipelineError');
      expect(error.code).toBe('PIPELINE_ERROR');
      expect(error.message).toBe('scraping: Failed to scrape module');
      expect(error.status_code).toBe(500);
    });

    it('should include stage name in message', () => {
      const error = new PipelineError('extraction', 'Content not found');
      expect(error.message).toContain('extraction');
    });

    it('should include details when provided', () => {
      const details = { stageOutput: 'error output' };
      const error = new PipelineError('processing', 'Failed', details);
      expect(error.details).toEqual(details);
    });

    it('should be an instanceof AppError', () => {
      const error = new PipelineError('test', 'message');
      expect(error instanceof AppError).toBe(true);
    });
  });
});
