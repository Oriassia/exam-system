const REQUIRED_AZURE_OPENAI_VARS = [
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_KEY',
  'AZURE_OPENAI_VERSION',
  'AZURE_OPENAI_DEPLOYMENT'
];

const REQUIRED_API_KEY_VARS = ['SUBMISSIONS_API_KEY'];

/**
 * Reads and validates the Azure OpenAI env vars, failing fast with the
 * names of anything missing instead of surfacing a confusing error on
 * the first grading request. `env` defaults to process.env but can be
 * passed in explicitly to keep this pure and easy to unit test.
 */
export function getAzureOpenAIConfig(env = process.env) {
  const missing = REQUIRED_AZURE_OPENAI_VARS.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Azure OpenAI environment variable(s): ${missing.join(', ')}`
    );
  }

  return {
    endpoint: env.AZURE_OPENAI_ENDPOINT.replace(/\/+$/, ''),
    key: env.AZURE_OPENAI_KEY,
    version: env.AZURE_OPENAI_VERSION,
    deployment: env.AZURE_OPENAI_DEPLOYMENT
  };
}

/**
 * Reads and validates the API key used to protect GET /submissions/:studentId,
 * failing fast at startup instead of surfacing a confusing error on the
 * first request. `env` defaults to process.env but can be passed in
 * explicitly to keep this pure and easy to unit test.
 */
export function getApiKeyConfig(env = process.env) {
  const missing = REQUIRED_API_KEY_VARS.filter((name) => !env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`
    );
  }

  return {
    submissionsApiKey: env.SUBMISSIONS_API_KEY
  };
}
