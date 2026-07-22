import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAzureOpenAIConfig } from './azureOpenAIConfig.js';

test('throws listing all missing env var names when none are set', () => {
  assert.throws(
    () => getAzureOpenAIConfig({}),
    (error) => {
      assert.match(error.message, /AZURE_OPENAI_ENDPOINT/);
      assert.match(error.message, /AZURE_OPENAI_KEY/);
      assert.match(error.message, /AZURE_OPENAI_VERSION/);
      assert.match(error.message, /AZURE_OPENAI_DEPLOYMENT/);
      return true;
    }
  );
});

test('throws listing only the specific missing env var names', () => {
  const env = {
    AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com',
    AZURE_OPENAI_KEY: 'test-key'
    // VERSION and DEPLOYMENT intentionally missing
  };

  assert.throws(
    () => getAzureOpenAIConfig(env),
    (error) => {
      assert.match(error.message, /AZURE_OPENAI_VERSION/);
      assert.match(error.message, /AZURE_OPENAI_DEPLOYMENT/);
      assert.doesNotMatch(error.message, /AZURE_OPENAI_ENDPOINT/);
      assert.doesNotMatch(error.message, /AZURE_OPENAI_KEY/);
      return true;
    }
  );
});

test('returns config with all four values when every env var is set', () => {
  const env = {
    AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com',
    AZURE_OPENAI_KEY: 'test-key',
    AZURE_OPENAI_VERSION: '2024-02-15-preview',
    AZURE_OPENAI_DEPLOYMENT: 'gpt-4o'
  };

  const config = getAzureOpenAIConfig(env);

  assert.deepEqual(config, {
    endpoint: 'https://example.openai.azure.com',
    key: 'test-key',
    version: '2024-02-15-preview',
    deployment: 'gpt-4o'
  });
});

test('strips a trailing slash from the endpoint', () => {
  const env = {
    AZURE_OPENAI_ENDPOINT: 'https://example.openai.azure.com/',
    AZURE_OPENAI_KEY: 'test-key',
    AZURE_OPENAI_VERSION: '2024-02-15-preview',
    AZURE_OPENAI_DEPLOYMENT: 'gpt-4o'
  };

  const config = getAzureOpenAIConfig(env);

  assert.equal(config.endpoint, 'https://example.openai.azure.com');
});
