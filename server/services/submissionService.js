import { getDb } from '../db/database.js';
import { AppError } from '../errors.js';

async function saveSubmission(submission) {
  const db = await getDb();
  const submissionsCollection = db.collection('submissions');
  const result = await submissionsCollection.insertOne(submission);
  return { insertedId: result.insertedId };
}

async function findSubmissionsByStudentId(studentId) {
  const db = await getDb();
  const submissionsCollection = db.collection('submissions');
  return submissionsCollection.find({ studentId }).sort({ submittedAt: -1 }).toArray();
}

/**
 * Orchestrates a single exam submission: look up the matching questions,
 * grade the answers, and persist the result - saving raw answers even
 * if grading fails, so a submission is never silently lost.
 */
export function createSubmissionService({ questionsService, gradingService }) {
  async function submit({ studentId, answers }) {
    const questionIds = answers.map((a) => a.questionId);
    const questions = await questionsService.findByIds(questionIds);

    if (questions.length === 0) {
      throw AppError.validation('No matching questions found for submitted answers');
    }

    let graded;
    try {
      graded = await gradingService.gradeSubmission({ answers, questions });
    } catch (error) {
      console.error('Grading failed:', error);
      const { insertedId } = await saveSubmission({
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

    const { insertedId } = await saveSubmission(submission);
    return { submissionId: insertedId.toString(), submission };
  }

  async function getByStudentId(studentId) {
    const submissions = await findSubmissionsByStudentId(studentId);

    return submissions.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
  }

  return { submit, getByStudentId };
}
