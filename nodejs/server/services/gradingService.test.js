import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGradingService } from './gradingService.js';

const questions = [
  { id: 1, text: 'What is a hash table?', rubric: 'Mentions O(1) lookup' },
  { id: 2, text: 'What is a stack?', rubric: 'Mentions LIFO' }
];

const answers = [
  { questionId: 1, answer: 'A key-value store.' },
  { questionId: 2, answer: 'LIFO structure.' }
];

function fakeLlmClient(results) {
  const calls = [];
  return {
    gradeAnswers: async (items) => {
      calls.push(items);
      return results;
    },
    calls
  };
}

test('passes questionText/rubric/answer for each matched question to the LLM client', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 90, feedback: 'Good.' },
    { questionId: 2, score: 80, feedback: 'Fine.' }
  ]);
  const service = createGradingService({ llmClient });

  await service.gradeSubmission({ answers, questions });

  assert.deepEqual(llmClient.calls[0], [
    { questionId: 1, questionText: 'What is a hash table?', rubric: 'Mentions O(1) lookup', answer: 'A key-value store.' },
    { questionId: 2, questionText: 'What is a stack?', rubric: 'Mentions LIFO', answer: 'LIFO structure.' }
  ]);
});

test('maps LLM results back onto each answer with score and feedback', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 90, feedback: 'Good.' },
    { questionId: 2, score: 80, feedback: 'Fine.' }
  ]);
  const service = createGradingService({ llmClient });

  const graded = await service.gradeSubmission({ answers, questions });

  assert.deepEqual(graded.answers, [
    { questionId: 1, answer: 'A key-value store.', score: 90, feedback: 'Good.' },
    { questionId: 2, answer: 'LIFO structure.', score: 80, feedback: 'Fine.' }
  ]);
});

test('computes overallScore as the average of per-question scores, rounded to 1 decimal', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 85, feedback: 'Good.' },
    { questionId: 2, score: 60, feedback: 'OK.' }
  ]);
  const service = createGradingService({ llmClient });

  const graded = await service.gradeSubmission({ answers, questions });

  assert.equal(graded.overallScore, 72.5);
});

test('ignores answers whose questionId has no matching question', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 90, feedback: 'Good.' }
  ]);
  const service = createGradingService({ llmClient });

  const answersWithExtra = [...answers.slice(0, 1), { questionId: 999, answer: 'stray answer' }];
  const graded = await service.gradeSubmission({ answers: answersWithExtra, questions });

  assert.equal(llmClient.calls[0].length, 1);
  assert.equal(graded.answers.length, 1);
  assert.equal(graded.answers[0].questionId, 1);
});

test('throws when the LLM omits a result for a submitted question', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 90, feedback: 'Good.' }
    // missing result for questionId 2
  ]);
  const service = createGradingService({ llmClient });

  await assert.rejects(
    () => service.gradeSubmission({ answers, questions }),
    /question 2/
  );
});
