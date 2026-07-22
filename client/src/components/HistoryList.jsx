import React from 'react'
import SubmissionListItem from './SubmissionListItem'
import '../styles/HistoryList.css'

function HistoryList({ submissions, onSelect }) {
  if (submissions.length === 0) {
    return <p className="history-empty">No submissions found for this student ID.</p>
  }

  const total = submissions.length

  return (
    <ul className="history-list">
      {submissions.map((submission, index) => (
        <SubmissionListItem
          key={submission.id}
          submission={submission}
          attemptNumber={total - index}
          onClick={() => onSelect(submission)}
        />
      ))}
    </ul>
  )
}

export default HistoryList
