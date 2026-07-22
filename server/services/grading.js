import { gradeAnswers } from './llm.js';

function buildFeedback(criteria, evaluations) {
  const byId = new Map(evaluations.map((e) => [e.criterionId, e]));
  const met = [];
  const missing = [];

  for (const criterion of criteria) {
    const evaluation = byId.get(criterion.id);
    if (evaluation?.satisfied) {
      met.push(criterion.description);
    } else {
      missing.push(criterion.description);
    }
  }

  const parts = [];
  if (met.length > 0) {
    parts.push(`Met: ${met.join('; ')}.`);
  }
  if (missing.length > 0) {
    parts.push(`Missing: ${missing.join('; ')}.`);
  }
  return parts.join(' ') || 'No criteria evaluated.';
}

function scoreFromEvaluations(criteria, evaluations) {
  const expectedIds = new Set(criteria.map((c) => c.id));
  const seenIds = new Set();

  for (const evaluation of evaluations) {
    if (!expectedIds.has(evaluation.criterionId)) {
      throw new Error(`Unexpected criterion "${evaluation.criterionId}" in LLM evaluations`);
    }
    if (seenIds.has(evaluation.criterionId)) {
      throw new Error(`Duplicate criterion "${evaluation.criterionId}" in LLM evaluations`);
    }
    seenIds.add(evaluation.criterionId);
  }

  for (const id of expectedIds) {
    if (!seenIds.has(id)) {
      throw new Error(`LLM did not return an evaluation for criterion "${id}"`);
    }
  }

  const satisfiedCount = evaluations.filter((e) => e.satisfied).length;
  return satisfiedCount / criteria.length;
}

export async function gradeSubmission({ answers, questions, llmClient = { gradeAnswers } }) {
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

  // Exam worth 100 points total, split evenly across its questions.
  const maxScore = items.length === 0 ? 0 : 100 / items.length;

  const scoredAnswers = items.map(({ questionId, answer, rubric }) => {
    const result = resultById.get(questionId);
    if (!result) {
      throw new Error(`LLM did not return a grading result for question ${questionId}`);
    }

    const criteria = rubric?.criteria;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      throw new Error(`Question ${questionId} is missing structured rubric criteria`);
    }

    const quality = scoreFromEvaluations(criteria, result.evaluations);
    const feedback = buildFeedback(criteria, result.evaluations);

    return {
      questionId,
      answer,
      feedback,
      points: quality * maxScore
    };
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
