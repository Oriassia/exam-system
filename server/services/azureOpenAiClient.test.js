import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAzureOpenAiClient } from './azureOpenAiClient.js';

const config = {
  endpoint: 'https://example.openai.azure.com',
  key: 'test-key',
  version: '2024-02-15-preview',
  deployment: 'gpt-4o'
};

const sampleItems = [
  { questionId: 1, questionText: 'What is a hash table?', rubric: 'Mentions O(1) lookup', answer: 'A key-value store.' },
  { questionId: 2, questionText: 'What is a stack?', rubric: 'Mentions LIFO', answer: 'LIFO structure.' }
];

function fakeFetch({ ok = true, status = 200, content, text } = {}) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return {
      ok,
      status,
      json: async () => ({ choices: [{ message: { content } }] }),
      text: async () => text ?? ''
    };
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

test('calls the Azure OpenAI chat completions endpoint with the right URL, headers, and method', async () => {
  const content = JSON.stringify({
    results: [
      { questionId: 1, score: 90, feedback: 'Good.' },
      { questionId: 2, score: 80, feedback: 'Fine.' }
    ]
  });
  const fetchImpl = fakeFetch({ content });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  await client.gradeAnswers(sampleItems);

  assert.equal(fetchImpl.calls.length, 1);
  const { url, options } = fetchImpl.calls[0];
  assert.equal(
    url,
    'https://example.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-15-preview'
  );
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['api-key'], 'test-key');
  assert.equal(options.headers['Content-Type'], 'application/json');
});

test('includes every question, rubric, and answer in the request body', async () => {
  const content = JSON.stringify({
    results: [
      { questionId: 1, score: 90, feedback: 'Good.' },
      { questionId: 2, score: 80, feedback: 'Fine.' }
    ]
  });
  const fetchImpl = fakeFetch({ content });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  await client.gradeAnswers(sampleItems);

  const body = JSON.parse(fetchImpl.calls[0].options.body);
  const userMessage = body.messages.find((m) => m.role === 'user').content;
  for (const item of sampleItems) {
    assert.ok(userMessage.includes(item.questionText));
    assert.ok(userMessage.includes(item.rubric));
    assert.ok(userMessage.includes(item.answer));
  }
});

test('parses a valid response into {questionId, score, feedback} results', async () => {
  const content = JSON.stringify({
    results: [
      { questionId: 1, score: 90, feedback: 'Good.' },
      { questionId: 2, score: 80, feedback: 'Fine.' }
    ]
  });
  const fetchImpl = fakeFetch({ content });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  const results = await client.gradeAnswers(sampleItems);

  assert.deepEqual(results, [
    { questionId: 1, score: 90, feedback: 'Good.' },
    { questionId: 2, score: 80, feedback: 'Fine.' }
  ]);
});

test('clamps out-of-range scores into 0-100', async () => {
  const content = JSON.stringify({
    results: [
      { questionId: 1, score: 150, feedback: 'Too high.' },
      { questionId: 2, score: -20, feedback: 'Too low.' }
    ]
  });
  const fetchImpl = fakeFetch({ content });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  const results = await client.gradeAnswers(sampleItems);

  assert.equal(results[0].score, 100);
  assert.equal(results[1].score, 0);
});

test('throws a descriptive error on a non-OK HTTP response', async () => {
  const fetchImpl = fakeFetch({ ok: false, status: 429, text: 'rate limited' });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  await assert.rejects(
    () => client.gradeAnswers(sampleItems),
    (error) => {
      assert.match(error.message, /429/);
      assert.match(error.message, /rate limited/);
      return true;
    }
  );
});

test('throws a descriptive error when the response content is not valid JSON', async () => {
  const fetchImpl = fakeFetch({ content: 'not json at all' });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  await assert.rejects(
    () => client.gradeAnswers(sampleItems),
    /valid JSON/
  );
});

test('throws a descriptive error when the "results" field is missing', async () => {
  const fetchImpl = fakeFetch({ content: JSON.stringify({ notResults: [] }) });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  await assert.rejects(
    () => client.gradeAnswers(sampleItems),
    /results/
  );
});

test('throws a descriptive error when a result item is malformed', async () => {
  const content = JSON.stringify({
    results: [
      { questionId: 1, score: 'not-a-number', feedback: 'Good.' }
    ]
  });
  const fetchImpl = fakeFetch({ content });
  const client = createAzureOpenAiClient({ config, fetchImpl });

  await assert.rejects(
    () => client.gradeAnswers(sampleItems),
    /index 0/
  );
});
