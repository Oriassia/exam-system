import React from 'react'
import '../styles/Question.css'
import '../styles/GradedQuestion.css'

function scoreBand(score, maxScore) {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  if (percentage >= 80) return 'score-high'
  if (percentage >= 50) return 'score-mid'
  return 'score-low'
}

function GradedQuestion({ questionNumber, questionText, answer, score, maxScore, feedback }) {
  return (
    <div className="question graded-question">
      <div className="question-header">
        <span className="question-number">Question {questionNumber}</span>
        <span className={`score-badge ${scoreBand(score, maxScore)}`}>{score}/{maxScore}</span>
      </div>
      <div className="question-text">{questionText}</div>

      <div className="answer-readonly">
        <span className="answer-readonly-label">Your answer</span>
        <p className="answer-readonly-text">{answer}</p>
      </div>

      <div className="feedback-box">
        <span className="feedback-label">Feedback</span>
        <p className="feedback-text">{feedback}</p>
      </div>
    </div>
  )
}

export default GradedQuestion
