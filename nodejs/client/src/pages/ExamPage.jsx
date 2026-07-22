import React, { useState, useEffect } from "react";
import QuestionList from "../components/QuestionList";
import SubmitButton from "../components/SubmitButton";
import ResultsView from "../components/ResultsView";
import { fetchQuestions, submitAnswers } from "../api/examApi";
import "../styles/ExamPage.css";

function ExamPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await fetchQuestions();
      setQuestions(data.questions);

      // Initialize answers object
      const initialAnswers = {};
      data.questions.forEach((q) => {
        initialAnswers[q.id] = "";
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(
        "Failed to load questions. Please make sure the backend is running."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!studentId.trim()) {
      alert("Please enter your Student ID");
      return;
    }

    // Convert answers object to array format
    const answersArray = Object.entries(answers).map(
      ([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: answer,
      })
    );

    try {
      setSubmitting(true);
      setError(null);
      const response = await submitAnswers(studentId, answersArray);
      setResult(response.submission);
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === "VALIDATION_ERROR") {
        setError(data.error);
      } else if (data?.code === "GRADING_FAILED") {
        setError(
          `Your answers were saved, but automatic grading failed. Reference ID: ${data.submissionId}. Please contact support.`
        );
      } else {
        setError("Failed to submit answers. Please try again.");
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setStudentId("");
    setError(null);
    loadQuestions();
  };

  if (loading) {
    return <div className="loading">Loading questions...</div>;
  }

  if (error && questions.length === 0) {
    return <div className="error">{error}</div>;
  }

  if (result) {
    return (
      <div className="exam-page">
        <header className="exam-header">
          <h1>Auto-Graded Exam System</h1>
          <p>Your exam has been graded</p>
        </header>

        <ResultsView
          result={result}
          questions={questions}
          onRetake={handleRetake}
        />
      </div>
    );
  }

  return (
    <div className="exam-page">
      <header className="exam-header">
        <h1>Auto-Graded Exam System</h1>
        <p>Answer all questions below and submit when ready</p>
      </header>

      <div className="student-id-section">
        <label htmlFor="studentId">Student ID:</label>
        <input
          id="studentId"
          type="text"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          placeholder="Enter your student ID"
          disabled={submitting}
        />
      </div>

      <QuestionList
        questions={questions}
        answers={answers}
        onAnswerChange={handleAnswerChange}
        disabled={submitting}
      />

      <SubmitButton
        onClick={handleSubmit}
        disabled={submitting || !studentId.trim()}
        submitting={submitting}
      />

      {error && questions.length > 0 && (
        <div className="error-message">{error}</div>
      )}
    </div>
  );
}

export default ExamPage;

