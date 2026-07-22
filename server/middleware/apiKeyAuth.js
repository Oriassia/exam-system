import { timingSafeEqual } from 'crypto';
import { AppError } from '../errors.js';
import { getApiKeyConfig } from '../config.js';

/**
 * Guards a route with a static API key sent as `X-API-Key`. Comparison
 * uses a fixed-time algorithm so response timing can't be used to guess
 * the key byte-by-byte. Throws (rather than responds directly) so it
 * composes with the app's existing AppError/errorHandler pipeline; Express
 * forwards synchronous throws from middleware to the error handler on its
 * own, so this doesn't need asyncHandler.
 */
export function apiKeyAuth(req, res, next) {
  const provided = req.headers['x-api-key'];

  if (typeof provided !== 'string') {
    throw AppError.unauthorized();
  }

  const expected = Buffer.from(getApiKeyConfig().submissionsApiKey);
  const providedBuffer = Buffer.from(provided);

  if (providedBuffer.length !== expected.length || !timingSafeEqual(providedBuffer, expected)) {
    throw AppError.unauthorized();
  }

  next();
}
