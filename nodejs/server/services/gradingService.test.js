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

test('maps LLM results back onto each answer, converting the 0-100 quality score into points out of an equal share of 100', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 90, feedback: 'Good.' },
    { questionId: 2, score: 80, feedback: 'Fine.' }
  ]);
  const service = createGradingService({ llmClient });

  const graded = await service.gradeSubmission({ answers, questions });

  assert.deepEqual(graded.answers, [
    { questionId: 1, answer: 'A key-value store.', score: 45, maxScore: 50, feedback: 'Good.' },
    { questionId: 2, answer: 'LIFO structure.', score: 40, maxScore: 50, feedback: 'Fine.' }
  ]);
});

test('computes overallScore as the sum of per-question points, which reaches 100 when every question is perfect', async () => {
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 100, feedback: 'Good.' },
    { questionId: 2, score: 100, feedback: 'OK.' }
  ]);
  const service = createGradingService({ llmClient });

  const graded = await service.gradeSubmission({ answers, questions });

  assert.equal(graded.overallScore, 100);
});

test('splits the 100 points evenly across however many questions are graded', async () => {
  const threeQuestions = [...questions, { id: 3, text: 'What is a queue?', rubric: 'Mentions FIFO' }];
  const threeAnswers = [...answers, { questionId: 3, answer: 'FIFO structure.' }];
  const llmClient = fakeLlmClient([
    { questionId: 1, score: 100, feedback: 'Good.' },
    { questionId: 2, score: 100, feedback: 'Good.' },
    { questionId: 3, score: 100, feedback: 'Good.' }
  ]);
  const service = createGradingService({ llmClient });

  const graded = await service.gradeSubmission({ answers: threeAnswers, questions: threeQuestions });

  assert.deepEqual(graded.answers.map((a) => a.maxScore), [33.3, 33.3, 33.3]);
  assert.equal(graded.overallScore, 100);
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
