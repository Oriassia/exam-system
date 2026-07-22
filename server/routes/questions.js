import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

router.get('/questions', async (req, res) => {
  try {
    const db = await getDb();
    const questions = await db.collection('questions')
      .aggregate([{ $sample: { size: 5 } }, { $project: { _id: 0 } }])
      .toArray();

    res.status(200).json({ success: true, questions });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
