import { getDb } from '../db/database.js';

const DEFAULT_QUESTION_COUNT = 5;

/**
 * Thin wrapper around the Mongo driver for the `questions` collection.
 * No business logic here - just query shape. Not unit-tested: these are
 * one-line driver calls, and testing them meaningfully needs a real (or
 * in-memory) MongoDB, which is disproportionate for this project.
 */
export const questionsRepository = {
  async sample(count = DEFAULT_QUESTION_COUNT) {
    const db = await getDb();
    const questionsCollection = db.collection('questions');

    const totalCount = await questionsCollection.countDocuments({});
    const sampleSize = Math.min(
      totalCount,
      Number.isInteger(count) && count > 0 ? count : DEFAULT_QUESTION_COUNT
    );

    return questionsCollection
      .aggregate([
        { $sample: { size: sampleSize } },
        { $project: { _id: 0 } }
      ])
      .toArray();
  },

  async findByIds(ids) {
    const db = await getDb();
    const questionsCollection = db.collection('questions');

    return questionsCollection
      .find({ id: { $in: ids } })
      .project({ _id: 0 })
      .toArray();
  }
};
