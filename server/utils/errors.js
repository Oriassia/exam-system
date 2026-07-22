/**
 * Single error class with factory methods (Boom-style) rather than a
 * subclass per error type. All the variants here differ only by status
 * code and, in one case, an extra field — not enough behavioral
 * difference to justify separate classes.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    Object.assign(this, extra);
  }

  static validation(message) {
    return new AppError(message, 400, { code: 'VALIDATION_ERROR' });
  }

  static gradingFailed(submissionId) {
    return new AppError('Automatic grading failed', 502, {
      code: 'GRADING_FAILED',
      submissionId
    });
  }

  static unauthorized(message = 'Missing or invalid API key') {
    return new AppError(message, 401, { code: 'UNAUTHORIZED' });
  }
}
