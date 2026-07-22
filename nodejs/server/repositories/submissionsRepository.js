import { getDb } from '../db/database.js';

/**
 * Thin wrapper around the Mongo driver for the `submissions` collection.
 * Not unit-tested for the same reason as questionsRepository - a one-line
 * driver call whose behavior is really MongoDB's, not ours.
 */
export const submissionsRepository = {
  async save(submission) {
    const db = await getDb();
    const submissionsCollection = db.collection('submissions');
    const result = await submissionsCollection.insertOne(submission);
    return { insertedId: result.insertedId };
  },

  async findByStudentId(studentId) {
    const db = await getDb();
    const submissionsCollection = db.collection('submissions');
    return submissionsCollection.find({ studentId }).sort({ submittedAt: -1 }).toArray();
  }
};
