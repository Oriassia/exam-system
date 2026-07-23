import React from 'react'
import Question from './Question'
import '../styles/QuestionList.css'

function QuestionList({ questions, answers, onAnswerChange, disabled }) {
  return (
    <div className="question-list">
      {questions.map((question, index) => (
        <Question
          key={question.id}
          questionNumber={index + 1}
          question={question}
          answer={answers[question.id] || ''}
          onAnswerChange={(value) => onAnswerChange(question.id, value)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

export default QuestionList

