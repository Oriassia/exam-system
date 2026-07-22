import { AppError } from '../utils/errors.js';

/**
 * Orchestrates a single exam submission: look up the matching questions,
 * grade the answers, and persist the result - saving raw answers even
 * if grading fails, so a submission is never silently lost.
 */
export function createSubmissionService({ questionsRepository, submissionsRepository, gradingService }) {
  async function submit({ studentId, answers }) {
    const questionIds = answers.map((a) => a.questionId);
    const questions = await questionsRepository.findByIds(questionIds);

    if (questions.length === 0) {
      throw AppError.validation('No matching questions found for submitted answers');
    }

    let graded;
    try {
      graded = await gradingService.gradeSubmission({ answers, questions });
    } catch (error) {
      console.error('Grading failed:', error);
      const { insertedId } = await submissionsRepository.save({
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

    const { insertedId } = await submissionsRepository.save(submission);
    return { submissionId: insertedId.toString(), submission };
  }

  async function getByStudentId(studentId) {
    const submissions = await submissionsRepository.findByStudentId(studentId);

    return submissions.map(({ _id, ...rest }) => ({ id: _id.toString(), ...rest }));
  }

  return { submit, getByStudentId };
}
