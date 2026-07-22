import { AppError } from '../utils/errors.js';

/**
 * Wraps an async controller method so a rejected promise reaches
 * Express's error pipeline via next(error) instead of crashing the
 * process or requiring a try/catch in every controller.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Generic error handler. Any AppError is shaped from its own fields
 * (statusCode, message, and whatever extra data a factory attached,
 * e.g. code/submissionId) — no per-error-type branching needed here.
 * Anything else is an unexpected bug: log it, hide details from the client.
 */
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    const { statusCode, message, name, ...rest } = err;
    return res.status(statusCode).json({
      success: false,
      error: message,
      ...rest
    });
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
}
