import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createQuestionsController } from './questionsController.js';

function fakeRes() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

function fakeQuestionsRepository(questions) {
  const calls = [];
  return {
    sample: async (count) => {
      calls.push(count);
      return questions;
    },
    calls
  };
}

test('responds 200 with questions from the repository', async () => {
  const questionsRepository = fakeQuestionsRepository([{ id: 1, text: 'q1', rubric: 'r1' }]);
  const controller = createQuestionsController({ questionsRepository });
  const req = { query: {} };
  const res = fakeRes();

  await controller.getQuestions(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.questions, [{ id: 1, text: 'q1', rubric: 'r1' }]);
});

test('passes a parsed integer count from the query string to the repository', async () => {
  const questionsRepository = fakeQuestionsRepository([]);
  const controller = createQuestionsController({ questionsRepository });
  const req = { query: { count: '3' } };
  const res = fakeRes();

  await controller.getQuestions(req, res);

  assert.equal(questionsRepository.calls[0], 3);
});
