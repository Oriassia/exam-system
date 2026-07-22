import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import HistoryList from '../components/HistoryList'
import ResultsView from '../components/ResultsView'
import { fetchQuestions, fetchSubmissions } from '../api/examApi'
import '../styles/HistoryPage.css'

function HistoryPage() {
  const { submissionId } = useParams()
  const navigate = useNavigate()
  const [studentId, setStudentId] = useState('')
  const [submissions, setSubmissions] = useState(null)
  const [questions, setQuestions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Looked up from the URL param rather than kept as separate state, so
  // browser back/forward between the list and a submission's detail view
  // works for free. If the id isn't in the currently-loaded list (e.g. a
  // hard refresh on a /history/:submissionId link before any student was
  // searched), this simply falls back to the search/list view below.
  const selectedSubmission = submissionId
    ? submissions?.find((s) => s.id === submissionId) ?? null
    : null

  const handleFetch = async () => {
    if (!studentId.trim()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [submissionsData, questionsData] = await Promise.all([
        fetchSubmissions(studentId.trim()),
        questions ? Promise.resolve(null) : fetchQuestions()
      ])

      setSubmissions(submissionsData.submissions)
      if (questionsData) {
        setQuestions(questionsData.questions)
      }
    } catch (err) {
      setError('Failed to fetch submissions. Please make sure the backend is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleFetch()
    }
  }

  if (selectedSubmission) {
    if (selectedSubmission.status !== 'graded') {
      return (
        <div className="history-page">
          <header className="history-header">
            <h1>Submission Details</h1>
          </header>
          <p className="history-grading-failed-message">
            This submission's answers were saved, but automatic grading failed for it.
          </p>
          <button className="action-button" onClick={() => navigate('/history')}>
            Back to History
          </button>
        </div>
      )
    }

    return (
      <div className="history-page">
        <header className="history-header">
          <h1>Submission Details</h1>
        </header>
        <ResultsView
          result={selectedSubmission}
          questions={questions || []}
          actionLabel="Back to History"
          onAction={() => navigate('/history')}
        />
      </div>
    )
  }

  return (
    <div className="history-page">
      <header className="history-header">
        <h1>Exam History</h1>
        <p>Look up past submissions for a student</p>
      </header>

      <div className="history-search">
        <label htmlFor="historyStudentId">Student ID:</label>
        <div className="history-search-row">
          <input
            id="historyStudentId"
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter student ID"
            disabled={loading}
          />
          <button onClick={handleFetch} disabled={loading || !studentId.trim()}>
            {loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>
      </div>

      {error && <div className="history-error">{error}</div>}

      {submissions && !error && (
        <HistoryList
          submissions={submissions}
          onSelect={(submission) => navigate(`/history/${submission.id}`)}
        />
      )}
    </div>
  )
}

export default HistoryPage
