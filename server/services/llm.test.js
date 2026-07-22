import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { gradeAnswers } from './llm.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.AZURE_OPENAI_ENDPOINT = 'https://example.openai.azure.com';
  process.env.AZURE_OPENAI_KEY = 'test-key';
  process.env.AZURE_OPENAI_DEPLOYMENT = 'test-deployment';
  process.env.AZURE_OPENAI_VERSION = '2024-02-15-preview';
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
});

const items = [
  {
    questionId: 1,
    questionText: 'What is a stack?',
    rubric: {
      criteria: [
        { id: 'lifo', description: 'States stack is LIFO' },
        { id: 'ops', description: 'Mentions push and pop' }
      ]
    },
    answer: 'A stack is LIFO.'
  }
];

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    }
  };
}

test('parses valid evaluations from Azure OpenAI JSON content', async () => {
  const evaluations = [
    { criterionId: 'lifo', quote: 'LIFO', satisfied: true },
    { criterionId: 'ops', quote: 'Missing', satisfied: false }
  ];
  const fetchImpl = async () =>
    jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              results: [{ questionId: 1, evaluations }]
            })
          }
        }
      ]
    });

  const results = await gradeAnswers(items, { fetchImpl });

  assert.deepEqual(results, [{ questionId: 1, evaluations }]);
});

test('rejects a non-OK HTTP response', async () => {
  const fetchImpl = async () => jsonResponse('bad gateway', 502);

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl }),
    /Azure OpenAI request failed with status 502/
  );
});

test('rejects a response missing the results array', async () => {
  const fetchImpl = async () =>
    jsonResponse({
      choices: [{ message: { content: JSON.stringify({ oops: true }) } }]
    });

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl }),
    /missing a "results" array/
  );
});

test('rejects a result missing evaluations', async () => {
  const fetchImpl = async () =>
    jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              results: [{ questionId: 1, score: 80, feedback: 'ok' }]
            })
          }
        }
      ]
    });

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl }),
    /malformed grading result/
  );
});

test('rejects a malformed evaluation entry', async () => {
  const fetchImpl = async () =>
    jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              results: [
                {
                  questionId: 1,
                  evaluations: [{ criterionId: 'lifo', quote: 'LIFO', satisfied: 'yes' }]
                }
              ]
            })
          }
        }
      ]
    });

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl }),
    /malformed evaluation/
  );
});
