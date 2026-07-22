import { AppError } from '../utils/errors.js';

/**
 * Thin HTTP glue: parse/validate the request, delegate to the
 * submission service, shape the response. No Mongo/LLM logic here -
 * that lives in services/submissionService.js. Errors are thrown, not
 * caught, so asyncHandler forwards them to the global errorHandler.
 */
export function createSubmissionsController({ submissionService }) {
  async function submit(req, res) {
    const { studentId, answers } = req.body || {};

    if (!studentId || !Array.isArray(answers) || answers.length === 0) {
      throw AppError.validation('studentId and a non-empty answers array are required');
    }

    const result = await submissionService.submit({ studentId, answers });

    res.status(201).json({
      success: true,
      submissionId: result.submissionId,
      submission: result.submission
    });
  }

  return { submit };
}
