import { timingSafeEqual } from 'crypto';
import { getApiKeyConfig } from '../config.js';

/**
 * Guards a route with a static API key sent as `X-API-Key`. Comparison
 * uses a fixed-time algorithm so response timing can't be used to guess
 * the key byte-by-byte.
 */
export function apiKeyAuth(req, res, next) {
  const provided = req.headers['x-api-key'];

  if (typeof provided !== 'string') {
    return res.status(401).json({ success: false, error: 'Missing or invalid API key' });
  }

  const expected = Buffer.from(getApiKeyConfig().submissionsApiKey);
  const providedBuffer = Buffer.from(provided);

  if (providedBuffer.length !== expected.length || !timingSafeEqual(providedBuffer, expected)) {
    return res.status(401).json({ success: false, error: 'Missing or invalid API key' });
  }

  next();
}
