import express from 'express';
import { getDb } from '../db/database.js';
import { gradeSubmission } from '../services/grading.js';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';

const router = express.Router();

router.post('/submit', async (req, res) => {
  try {
    const { studentId, answers } = req.body || {};
    console.log(`[submit] received studentId=${studentId ?? 'missing'} answers=${Array.isArray(answers) ? answers.length : 'invalid'}`);

    if (!studentId || !Array.isArray(answers) || answers.length === 0) {
      console.warn('[submit] rejected: missing studentId or empty answers');
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
    console.log(`[submit] loaded ${questions.length} question(s) from db`);

    if (questions.length === 0) {
      console.warn('[submit] rejected: no matching questions');
      return res.status(400).json({
        success: false,
        error: 'No matching questions found for submitted answers'
      });
    }

    // Save raw answers even if grading fails, so a submission is never
    // silently lost.
    let graded;
    try {
      console.log(`[submit] grading ${answers.length} answer(s)…`);
      graded = await gradeSubmission({ answers, questions });
      console.log(`[submit] grading done overallScore=${graded.overallScore}`);
    } catch (error) {
      console.error('[submit] grading failed:', error.message);
      const { insertedId } = await db.collection('submissions').insertOne({
        studentId,
        answers,
        status: 'grading_failed',
        submittedAt: new Date()
      });
      console.log(`[submit] saved grading_failed submission id=${insertedId}`);
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
    console.log(`[submit] saved graded submission id=${insertedId} studentId=${studentId}`);

    res.status(201).json({
      success: true,
      submissionId: insertedId.toString(),
      submission
    });
  } catch (error) {
    console.error('[submit] unexpected error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/submissions/:studentId', apiKeyAuth, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`[submissions] list for studentId=${studentId}`);
    const db = await getDb();
    const submissions = await db.collection('submissions')
      .find({ studentId })
      .sort({ submittedAt: -1 })
      .toArray();
    console.log(`[submissions] found ${submissions.length} record(s)`);

    // Older graded rows may lack questionText; fill from the question bank
    // so history details can still show the prompt.
    const missingIds = [
      ...new Set(
        submissions.flatMap((s) =>
          (s.answers || [])
            .filter((a) => a.questionId != null && !a.questionText)
            .map((a) => a.questionId)
        )
      )
    ];
    const textById = new Map();
    if (missingIds.length > 0) {
      const questions = await db.collection('questions')
        .find({ id: { $in: missingIds } })
        .project({ _id: 0, id: 1, text: 1 })
        .toArray();
      for (const q of questions) {
        textById.set(q.id, q.text);
      }
    }

    res.status(200).json({
      success: true,
      submissions: submissions.map(({ _id, answers, ...rest }) => ({
        id: _id.toString(),
        ...rest,
        answers: (answers || []).map((a) => ({
          ...a,
          questionText: a.questionText || textById.get(a.questionId) || undefined
        }))
      }))
    });
  } catch (error) {
    console.error('[submissions] list failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
