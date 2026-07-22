import express from 'express';
import { getDb } from '../db/database.js';
import { gradeSubmission } from '../services/grading.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const { studentId, answers } = req.body || {};

    if (!studentId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'studentId and a non-empty answers array are required'
      });
    }

    const db = await getDb();
    const questions = await db.collection('questions')
      .find({ id: { $in: answers.map((a) => a.questionId) } })
      .project({ _id: 0 })
      .toArray();

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No matching questions found for submitted answers'
      });
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
      return res.status(502).json({
        success: false,
        error: 'Automatic grading failed',
        submissionId: insertedId.toString()
      });
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/submissions/:studentId', apiKeyAuth, async (req, res) => {
  try {
    const db = await getDb();
    const submissions = await db.collection('submissions')
      .find({ studentId: req.params.studentId })
      .sort({ submittedAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      submissions: submissions.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
