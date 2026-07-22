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

    // The exam is worth 100 points total, split evenly across its questions,
    // so a perfect submission's per-question points always sum to 100.
    const maxScore = items.length === 0 ? 0 : 100 / items.length;

    const scoredAnswers = items.map(({ questionId, answer }) => {
      const result = resultById.get(questionId);
      if (!result) {
        throw new Error(`LLM did not return a grading result for question ${questionId}`);
      }
      return { questionId, answer, feedback: result.feedback, points: (result.score / 100) * maxScore };
    });

    const gradedAnswers = scoredAnswers.map(({ questionId, answer, feedback, points }) => ({
      questionId,
      answer,
      score: Math.round(points * 10) / 10,
      maxScore: Math.round(maxScore * 10) / 10,
      feedback
    }));

    // Sum the unrounded per-question points (not the already-rounded display
    // scores) so a perfect submission's overall score lands exactly on 100.
    const overallScore = scoredAnswers.length === 0
      ? 0
      : Math.round(scoredAnswers.reduce((sum, a) => sum + a.points, 0) * 10) / 10;

    return { answers: gradedAnswers, overallScore };
  }

  return { gradeSubmission };
}
