import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeSubmission } from './grading.js';

const questions = [
  {
    id: 1,
    text: 'What is a hash table?',
    rubric: {
      criteria: [
        { id: 'key_value', description: 'Describes key-value storage' },
        { id: 'complexity', description: 'States average O(1) lookup' }
      ]
    }
  },
  {
    id: 2,
    text: 'What is a stack?',
    rubric: {
      criteria: [
        { id: 'lifo', description: 'States stack is LIFO' },
        { id: 'ops', description: 'Mentions push and pop' }
      ]
    }
  }
];

const answers = [
  { questionId: 1, answer: 'A key-value store with O(1) lookup.' },
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
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'key-value', satisfied: true },
        { criterionId: 'complexity', quote: 'O(1)', satisfied: true }
      ]
    },
    {
      questionId: 2,
      evaluations: [
        { criterionId: 'lifo', quote: 'LIFO', satisfied: true },
        { criterionId: 'ops', quote: 'Missing', satisfied: false }
      ]
    }
  ]);

  await gradeSubmission({ answers, questions, llmClient });

  assert.deepEqual(llmClient.calls[0], [
    {
      questionId: 1,
      questionText: 'What is a hash table?',
      rubric: questions[0].rubric,
      answer: 'A key-value store with O(1) lookup.'
    },
    {
      questionId: 2,
      questionText: 'What is a stack?',
      rubric: questions[1].rubric,
      answer: 'LIFO structure.'
    }
  ]);
});

test('maps LLM evaluations onto points: half the criteria satisfied yields half of maxScore', async () => {
  const llmClient = fakeLlmClient([
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'key-value', satisfied: true },
        { criterionId: 'complexity', quote: 'Missing', satisfied: false }
      ]
    },
    {
      questionId: 2,
      evaluations: [
        { criterionId: 'lifo', quote: 'LIFO', satisfied: true },
        { criterionId: 'ops', quote: 'Missing', satisfied: false }
      ]
    }
  ]);

  const graded = await gradeSubmission({ answers, questions, llmClient });

  assert.deepEqual(graded.answers, [
    {
      questionId: 1,
      answer: 'A key-value store with O(1) lookup.',
      score: 25,
      maxScore: 50,
      feedback: 'Met: Describes key-value storage. Missing: States average O(1) lookup.'
    },
    {
      questionId: 2,
      answer: 'LIFO structure.',
      score: 25,
      maxScore: 50,
      feedback: 'Met: States stack is LIFO. Missing: Mentions push and pop.'
    }
  ]);
  assert.equal(graded.overallScore, 50);
});

test('computes overallScore as the sum of per-question points, which reaches 100 when every criterion is satisfied', async () => {
  const llmClient = fakeLlmClient([
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'ok', satisfied: true },
        { criterionId: 'complexity', quote: 'ok', satisfied: true }
      ]
    },
    {
      questionId: 2,
      evaluations: [
        { criterionId: 'lifo', quote: 'ok', satisfied: true },
        { criterionId: 'ops', quote: 'ok', satisfied: true }
      ]
    }
  ]);

  const graded = await gradeSubmission({ answers, questions, llmClient });

  assert.equal(graded.overallScore, 100);
});

test('splits the 100 points evenly across however many questions are graded', async () => {
  const threeQuestions = [
    ...questions,
    {
      id: 3,
      text: 'What is a queue?',
      rubric: {
        criteria: [{ id: 'fifo', description: 'Mentions FIFO' }]
      }
    }
  ];
  const threeAnswers = [...answers, { questionId: 3, answer: 'FIFO structure.' }];
  const llmClient = fakeLlmClient([
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'ok', satisfied: true },
        { criterionId: 'complexity', quote: 'ok', satisfied: true }
      ]
    },
    {
      questionId: 2,
      evaluations: [
        { criterionId: 'lifo', quote: 'ok', satisfied: true },
        { criterionId: 'ops', quote: 'ok', satisfied: true }
      ]
    },
    {
      questionId: 3,
      evaluations: [{ criterionId: 'fifo', quote: 'FIFO', satisfied: true }]
    }
  ]);

  const graded = await gradeSubmission({ answers: threeAnswers, questions: threeQuestions, llmClient });

  assert.deepEqual(graded.answers.map((a) => a.maxScore), [33.3, 33.3, 33.3]);
  assert.equal(graded.overallScore, 100);
});

test('ignores answers whose questionId has no matching question', async () => {
  const llmClient = fakeLlmClient([
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'ok', satisfied: true },
        { criterionId: 'complexity', quote: 'ok', satisfied: true }
      ]
    }
  ]);

  const answersWithExtra = [...answers.slice(0, 1), { questionId: 999, answer: 'stray answer' }];
  const graded = await gradeSubmission({ answers: answersWithExtra, questions, llmClient });

  assert.equal(llmClient.calls[0].length, 1);
  assert.equal(graded.answers.length, 1);
  assert.equal(graded.answers[0].questionId, 1);
});

test('throws when the LLM omits a result for a submitted question', async () => {
  const llmClient = fakeLlmClient([
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'ok', satisfied: true },
        { criterionId: 'complexity', quote: 'ok', satisfied: true }
      ]
    }
    // missing result for questionId 2
  ]);

  await assert.rejects(
    () => gradeSubmission({ answers, questions, llmClient }),
    /question 2/
  );
});

test('throws when the LLM omits an evaluation for a rubric criterion', async () => {
  const llmClient = fakeLlmClient([
    {
      questionId: 1,
      evaluations: [
        { criterionId: 'key_value', quote: 'ok', satisfied: true }
        // missing complexity
      ]
    },
    {
      questionId: 2,
      evaluations: [
        { criterionId: 'lifo', quote: 'ok', satisfied: true },
        { criterionId: 'ops', quote: 'ok', satisfied: true }
      ]
    }
  ]);

  await assert.rejects(
    () => gradeSubmission({ answers, questions, llmClient }),
    /criterion "complexity"/
  );
});
