import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getApiKeyConfig } from './apiKeyConfig.js';

test('throws listing the missing env var name when SUBMISSIONS_API_KEY is unset', () => {
  assert.throws(
    () => getApiKeyConfig({}),
    (error) => {
      assert.match(error.message, /SUBMISSIONS_API_KEY/);
      return true;
    }
  );
});

test('returns the config when SUBMISSIONS_API_KEY is set', () => {
  const config = getApiKeyConfig({ SUBMISSIONS_API_KEY: 'test-key' });

  assert.deepEqual(config, { submissionsApiKey: 'test-key' });
});
