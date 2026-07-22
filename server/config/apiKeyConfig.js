const REQUIRED_VARS = ['SUBMISSIONS_API_KEY'];

/**
 * Reads and validates the API key used to protect GET /submissions/:studentId,
 * failing fast at startup instead of surfacing a confusing error on the
 * first request. `env` defaults to process.env but can be passed in
 * explicitly to keep this pure and easy to unit test.
 */
export function getApiKeyConfig(env = process.env) {
  const missing = REQUIRED_VARS.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`
    );
  }

  return {
    submissionsApiKey: env.SUBMISSIONS_API_KEY
  };
}
