import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionService } from './submissionService.js';
import { AppError } from '../utils/errors.js';

const studentId = 'student-1';
const answers = [
  { questionId: 1, answer: 'A key-value store.' },
  { questionId: 2, answer: 'LIFO structure.' }
];
const questions = [
  { id: 1, text: 'What is a hash table?', rubric: 'Mentions O(1) lookup' },
  { id: 2, text: 'What is a stack?', rubric: 'Mentions LIFO' }
];

function fakeInsertedId(value) {
  return { toString: () => value };
}

function fakeQuestionsRepository(result = questions) {
  return { findByIds: async () => result };
}

function fakeSubmissionsRepository(insertedIdValue = 'submission-id-1') {
  const savedDocs = [];
  return {
    save: async (doc) => {
      savedDocs.push(doc);
      return { insertedId: fakeInsertedId(insertedIdValue) };
    },
    savedDocs
  };
}

function fakeGradingService(result) {
  return {
    gradeSubmission: async () => {
      if (result instanceof Error) throw result;
      return result;
    }
  };
}

test('saves a graded submission and returns its id and document', async () => {
  const questionsRepository = fakeQuestionsRepository();
  const submissionsRepository = fakeSubmissionsRepository('submission-id-1');
  const gradingService = fakeGradingService({
    answers: [
      { questionId: 1, answer: 'A key-value store.', score: 90, feedback: 'Good.' },
      { questionId: 2, answer: 'LIFO structure.', score: 80, feedback: 'Fine.' }
    ],
    overallScore: 85
  });
  const service = createSubmissionService({ questionsRepository, submissionsRepository, gradingService });

  const result = await service.submit({ studentId, answers });

  assert.equal(result.submissionId, 'submission-id-1');
  assert.equal(result.submission.status, 'graded');
  assert.equal(result.submission.studentId, studentId);
  assert.equal(result.submission.overallScore, 85);
  assert.equal(result.submission.answers.length, 2);
  assert.ok(result.submission.submittedAt instanceof Date);
  assert.ok(result.submission.gradedAt instanceof Date);

  assert.equal(submissionsRepository.savedDocs.length, 1);
  assert.equal(submissionsRepository.savedDocs[0].status, 'graded');
});

test('throws a validation AppError when no questions match the submitted answers', async () => {
  const questionsRepository = fakeQuestionsRepository([]);
  const submissionsRepository = fakeSubmissionsRepository();
  const gradingService = fakeGradingService({ answers: [], overallScore: 0 });
  const service = createSubmissionService({ questionsRepository, submissionsRepository, gradingService });

  await assert.rejects(
    () => service.submit({ studentId, answers }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      return true;
    }
  );

  assert.equal(submissionsRepository.savedDocs.length, 0);
});

test('on grading failure, saves the raw answers as grading_failed then throws a gradingFailed AppError', async () => {
  const questionsRepository = fakeQuestionsRepository();
  const submissionsRepository = fakeSubmissionsRepository('submission-id-2');
  const gradingService = fakeGradingService(new Error('LLM exploded'));
  const service = createSubmissionService({ questionsRepository, submissionsRepository, gradingService });

  await assert.rejects(
    () => service.submit({ studentId, answers }),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 502);
      assert.equal(error.code, 'GRADING_FAILED');
      assert.equal(error.submissionId, 'submission-id-2');
      return true;
    }
  );

  assert.equal(submissionsRepository.savedDocs.length, 1);
  const saved = submissionsRepository.savedDocs[0];
  assert.equal(saved.status, 'grading_failed');
  assert.equal(saved.studentId, studentId);
  assert.deepEqual(saved.answers, answers);
});
