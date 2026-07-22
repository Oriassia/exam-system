import React from 'react'
import GradedQuestion from './GradedQuestion'
import '../styles/ResultsView.css'

function ResultsView({ result, questions, onRetake }) {
  const questionById = new Map(questions.map((q) => [q.id, q]))

  return (
    <div className="results-view">
      <div className="overall-score-banner">
        <span className="overall-score-label">Overall Score</span>
        <span className="overall-score-value">{result.overallScore} / 100</span>
      </div>

      <div className="graded-question-list">
        {result.answers.map((a) => (
          <GradedQuestion
            key={a.questionId}
            questionNumber={a.questionId}
            questionText={questionById.get(a.questionId)?.text || 'Question'}
            answer={a.answer}
            score={a.score}
            maxScore={a.maxScore}
            feedback={a.feedback}
          />
        ))}
      </div>

      <button className="retake-button" onClick={onRetake}>
        Take Another Exam
      </button>
    </div>
  )
}

export default ResultsView
