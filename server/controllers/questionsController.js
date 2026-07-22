/**
 * Thin HTTP glue over questionsRepository - no query/business logic here.
 */
export function createQuestionsController({ questionsRepository }) {
  async function getQuestions(req, res) {
    const count = parseInt(req.query.count, 10);
    const questions = await questionsRepository.sample(count);

    res.status(200).json({
      success: true,
      questions
    });
  }

  return { getQuestions };
}
