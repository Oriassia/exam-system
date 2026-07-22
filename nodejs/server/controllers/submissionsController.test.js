import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSubmissionsController } from './submissionsController.js';
import { AppError } from '../utils/errors.js';

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

function fakeSubmissionService(resultOrError) {
  const calls = [];
  return {
    submit: async (args) => {
      calls.push(args);
      if (resultOrError instanceof Error) throw resultOrError;
      return resultOrError;
    },
    calls
  };
}

test('submits valid input and responds 201 with the submissionId and submission', async () => {
  const submissionService = fakeSubmissionService({
    submissionId: 'sub-1',
    submission: { status: 'graded', overallScore: 90 }
  });
  const controller = createSubmissionsController({ submissionService });
  const req = { body: { studentId: 's1', answers: [{ questionId: 1, answer: 'x' }] } };
  const res = fakeRes();

  await controller.submit(req, res);

  assert.equal(submissionService.calls.length, 1);
  assert.deepEqual(submissionService.calls[0], { studentId: 's1', answers: [{ questionId: 1, answer: 'x' }] });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.submissionId, 'sub-1');
  assert.equal(res.body.submission.status, 'graded');
});

test('throws a 400 validation AppError when studentId is missing, without calling the service', async () => {
  const submissionService = fakeSubmissionService({ submissionId: 'sub-1', submission: {} });
  const controller = createSubmissionsController({ submissionService });
  const req = { body: { answers: [{ questionId: 1, answer: 'x' }] } };
  const res = fakeRes();

  await assert.rejects(
    () => controller.submit(req, res),
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 400);
      return true;
    }
  );
  assert.equal(submissionService.calls.length, 0);
});

test('throws a 400 validation AppError when answers is missing or empty', async () => {
  const submissionService = fakeSubmissionService({ submissionId: 'sub-1', submission: {} });
  const controller = createSubmissionsController({ submissionService });
  const req = { body: { studentId: 's1', answers: [] } };
  const res = fakeRes();

  await assert.rejects(() => controller.submit(req, res));
  assert.equal(submissionService.calls.length, 0);
});

test('propagates errors thrown by the submission service (e.g. grading failure)', async () => {
  const submissionService = fakeSubmissionService(AppError.gradingFailed('sub-2'));
  const controller = createSubmissionsController({ submissionService });
  const req = { body: { studentId: 's1', answers: [{ questionId: 1, answer: 'x' }] } };
  const res = fakeRes();

  await assert.rejects(
    () => controller.submit(req, res),
    (error) => {
      assert.equal(error.statusCode, 502);
      assert.equal(error.submissionId, 'sub-2');
      return true;
    }
  );
});
