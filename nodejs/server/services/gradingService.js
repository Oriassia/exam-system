/**
 * Pure grading orchestration: matches submitted answers to their
 * questions, delegates the actual grading to an injected LLM client,
 * and computes the overall score. No Mongo/Express imports, so this
 * is testable with a fake llmClient.
 */
export function createGradingService({ llmClient }) {
  async function gradeSubmission({ answers, questions }) {
    const questionById = new Map(questions.map((q) => [q.id, q]));

    const items = answers
      .filter((a) => questionById.has(a.questionId))
      .map((a) => {
        const question = questionById.get(a.questionId);
        return {
          questionId: a.questionId,
          questionText: question.text,
          rubric: question.rubric,
          answer: a.answer
        };
      });

    const results = await llmClient.gradeAnswers(items);
    const resultById = new Map(results.map((r) => [r.questionId, r]));

    const gradedAnswers = items.map(({ questionId, answer }) => {
      const result = resultById.get(questionId);
      if (!result) {
        throw new Error(`LLM did not return a grading result for question ${questionId}`);
      }
      return { questionId, answer, score: result.score, feedback: result.feedback };
    });

    const overallScore = gradedAnswers.length === 0
      ? 0
      : Math.round(
        (gradedAnswers.reduce((sum, a) => sum + a.score, 0) / gradedAnswers.length) * 10
      ) / 10;

    return { answers: gradedAnswers, overallScore };
  }

  return { gradeSubmission };
}
