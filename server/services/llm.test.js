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

const evaluations = [
  { criterionId: 'lifo', quote: 'LIFO', satisfied: true },
  { criterionId: 'ops', quote: 'Missing', satisfied: false }
];

function successBody() {
  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            results: [{ questionId: 1, evaluations }]
          })
        }
      }
    ]
  };
}

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

function recordingSleep() {
  const delays = [];
  const sleep = async (ms) => {
    delays.push(ms);
  };
  return { sleep, delays };
}

test('parses valid evaluations from Azure OpenAI JSON content', async () => {
  const fetchImpl = async () => jsonResponse(successBody());

  const results = await gradeAnswers(items, { fetchImpl });

  assert.deepEqual(results, [{ questionId: 1, evaluations }]);
});

test('retries 502 then succeeds', async () => {
  let calls = 0;
  const { sleep, delays } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    if (calls < 3) {
      return jsonResponse('bad gateway', 502);
    }
    return jsonResponse(successBody());
  };

  const results = await gradeAnswers(items, { fetchImpl, sleep });

  assert.equal(calls, 3);
  assert.equal(delays.length, 2);
  assert.deepEqual(results, [{ questionId: 1, evaluations }]);
});

test('retries network error then succeeds', async () => {
  let calls = 0;
  const { sleep } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      throw new TypeError('fetch failed');
    }
    return jsonResponse(successBody());
  };

  const results = await gradeAnswers(items, { fetchImpl, sleep });

  assert.equal(calls, 2);
  assert.deepEqual(results, [{ questionId: 1, evaluations }]);
});

test('retries empty content then succeeds', async () => {
  let calls = 0;
  const { sleep } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return jsonResponse({ choices: [{ message: { content: '' } }] });
    }
    return jsonResponse(successBody());
  };

  const results = await gradeAnswers(items, { fetchImpl, sleep });

  assert.equal(calls, 2);
  assert.deepEqual(results, [{ questionId: 1, evaluations }]);
});

test('exhausts retries on persistent 502', async () => {
  let calls = 0;
  const { sleep, delays } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse('bad gateway', 502);
  };

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl, sleep }),
    /Azure OpenAI request failed with status 502/
  );
  assert.equal(calls, 3);
  assert.equal(delays.length, 2);
});

test('does not retry HTTP 400', async () => {
  let calls = 0;
  const { sleep, delays } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse('bad request', 400);
  };

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl, sleep }),
    /Azure OpenAI request failed with status 400/
  );
  assert.equal(calls, 1);
  assert.equal(delays.length, 0);
});

test('does not retry a response missing the results array', async () => {
  let calls = 0;
  const { sleep, delays } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse({
      choices: [{ message: { content: JSON.stringify({ oops: true }) } }]
    });
  };

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl, sleep }),
    /missing a "results" array/
  );
  assert.equal(calls, 1);
  assert.equal(delays.length, 0);
});

test('does not retry malformed JSON content', async () => {
  let calls = 0;
  const { sleep, delays } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse({
      choices: [{ message: { content: 'not-json{' } }]
    });
  };

  await assert.rejects(
    () => gradeAnswers(items, { fetchImpl, sleep }),
    /not valid JSON/
  );
  assert.equal(calls, 1);
  assert.equal(delays.length, 0);
});

test('uses exponential backoff with jitter between retries', async () => {
  let calls = 0;
  const { sleep, delays } = recordingSleep();
  const fetchImpl = async () => {
    calls += 1;
    return jsonResponse('bad gateway', 502);
  };

  await assert.rejects(() => gradeAnswers(items, { fetchImpl, sleep }));

  assert.equal(calls, 3);
  assert.equal(delays.length, 2);
  // 200ms * 4^(attempt-1) + jitter 0..100 → first ~200-300, second ~800-900
  assert.ok(delays[0] >= 200 && delays[0] <= 300, `first delay ${delays[0]}`);
  assert.ok(delays[1] >= 800 && delays[1] <= 900, `second delay ${delays[1]}`);
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
