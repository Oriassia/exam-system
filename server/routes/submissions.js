import express from 'express';
import { getDb } from '../db/database.js';
import { gradeSubmission } from '../services/grading.js';
import { AppError } from '../errors.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

const router = express.Router();

router.post('/submit', asyncHandler(async (req, res) => {
  const { studentId, answers } = req.body || {};

  if (!studentId || !Array.isArray(answers) || answers.length === 0) {
    throw AppError.validation('studentId and a non-empty answers array are required');
  }

  const db = await getDb();
  const questions = await db.collection('questions')
    .find({ id: { $in: answers.map((a) => a.questionId) } })
    .project({ _id: 0 })
    .toArray();

  if (questions.length === 0) {
    throw AppError.validation('No matching questions found for submitted answers');
  }

  // Save raw answers even if grading fails, so a submission is never
  // silently lost.
  let graded;
  try {
    graded = await gradeSubmission({ answers, questions });
  } catch (error) {
    console.error('Grading failed:', error);
    const { insertedId } = await db.collection('submissions').insertOne({
      studentId,
      answers,
      status: 'grading_failed',
      submittedAt: new Date()
    });
    throw AppError.gradingFailed(insertedId.toString());
  }

  const submission = {
    studentId,
    answers: graded.answers,
    overallScore: graded.overallScore,
    status: 'graded',
    submittedAt: new Date(),
    gradedAt: new Date()
  };
  const { insertedId } = await db.collection('submissions').insertOne(submission);

  res.status(201).json({
    success: true,
    submissionId: insertedId.toString(),
    submission
  });
}));

router.get('/submissions/:studentId', apiKeyAuth, asyncHandler(async (req, res) => {
  const db = await getDb();
  const submissions = await db.collection('submissions')
    .find({ studentId: req.params.studentId })
    .sort({ submittedAt: -1 })
    .toArray();

  res.status(200).json({
    success: true,
    submissions: submissions.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))
  });
}));

export default router;
