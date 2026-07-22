/**
 * Thin HTTP glue over questionsService - no query/business logic here.
 */
export function createQuestionsController({ questionsService }) {
  async function getQuestions(req, res) {
    const count = parseInt(req.query.count, 10);
    const questions = await questionsService.sample(count);

    res.status(200).json({
      success: true,
      questions
    });
  }

  return { getQuestions };
}
