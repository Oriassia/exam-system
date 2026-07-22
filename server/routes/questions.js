import express from 'express';
import { getDb } from '../db/database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();
const DEFAULT_QUESTION_COUNT = 5;

router.get('/questions', asyncHandler(async (req, res) => {
  const db = await getDb();
  const questionsCollection = db.collection('questions');

  const requested = parseInt(req.query.count, 10);
  const count = Number.isInteger(requested) && requested > 0 ? requested : DEFAULT_QUESTION_COUNT;
  const totalCount = await questionsCollection.countDocuments({});

  const questions = await questionsCollection
    .aggregate([{ $sample: { size: Math.min(totalCount, count) } }, { $project: { _id: 0 } }])
    .toArray();

  res.status(200).json({ success: true, questions });
}));

export default router;
