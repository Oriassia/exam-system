import React from 'react'
import '../styles/SubmissionListItem.css'

function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function SubmissionListItem({ submission, attemptNumber, onClick }) {
  const isGraded = submission.status === 'graded'

  return (
    <li>
      <button className="submission-item" onClick={onClick}>
        <div className="submission-item-main">
          <span className="submission-item-title">Attempt #{attemptNumber}</span>
          <span className="submission-item-date">{formatDate(submission.submittedAt)}</span>
        </div>
        <div className="submission-item-meta">
          <span className="submission-item-questions">
            {submission.answers.length} question{submission.answers.length === 1 ? '' : 's'}
          </span>
          {isGraded ? (
            <span className="submission-item-score">{submission.overallScore} / 100</span>
          ) : (
            <span className="submission-item-status-failed">Grading failed</span>
          )}
        </div>
      </button>
    </li>
  )
}

export default SubmissionListItem
