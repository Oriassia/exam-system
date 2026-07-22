# Auto-Graded Exam — Implementation Plan

Tracking doc for the auto-grading feature. Stack: **Node.js/Express** backend (`nodejs/server`), **React** frontend (`nodejs/client`), MongoDB, Azure OpenAI for grading.

## Decisions

- **Backend**: Node.js/Express (Azure OpenAI creds already configured in `nodejs/server/.env`).
- **Grading flow**: Synchronous — `POST /submit` calls the LLM inline and returns the graded result in the same response.
- **LLM calls**: Batched — one chat completion per submission (all questions + rubrics + answers in one prompt), not one call per question.
- **Scope**: Required grading flow + submission history (optional feature) + a few automated tests around the grading logic.
- **Out of scope**: Auth/student identity hardening (tracked separately in `IMPROVEMENTS.md`).

## Architecture

```
Client (React)                Server (Express)                    Azure OpenAI
──────────────                ─────────────────                    ────────────
ExamPage submits    ──POST──▶ /submit
answers                         ├─ validate input
                                 ├─ fetch questions+rubrics (Mongo)
                                 ├─ gradingService.gradeSubmission()
                                 │     └─ llmClient.grade() ───────▶ chat/completions
                                 │                          ◀──────  JSON {score, feedback}[]
                                 ├─ build graded submission doc
                                 └─ save to `submissions` (Mongo)
                     ◀─response─┘  returns graded result

ResultsView shown    ◀────────  same response (sync flow)

History page         ──GET───▶ /submissions/:studentId  → list from Mongo
```

Key boundary: **LLM client** (talks to Azure OpenAI only) is separate from the **grading service** (orchestrates Mongo + LLM client). Neither knows about Express/HTTP.

**Backend layering** (implemented): `routes -> controllers -> services -> repositories -> db (Mongo)`, with a separate `services/azureOpenAiClient.js -> Azure OpenAI` branch off the grading service. Errors use a single `AppError` class with factory methods (`AppError.validation(...)`, `AppError.gradingFailed(submissionId)`) plus a global `errorHandler`/`asyncHandler` middleware pair, instead of ad-hoc `try/catch` in every route. Every layer that isn't a thin Mongo wrapper is built test-first (`node:test`) with dependencies (LLM client, repositories) injected via factory functions, so tests never touch the network or a real database.

## Data model

`submissions` collection, extended:

```js
{
  studentId: "abc123",
  answers: [
    { questionId: 1, answer: "...", score: 85, feedback: "Good example, but missed..." },
    { questionId: 2, answer: "...", score: 60, feedback: "..." }
  ],
  overallScore: 72.5,          // derived, e.g. average of per-question scores
  status: "graded",            // "graded" | "grading_failed"
  submittedAt: Date,
  gradedAt: Date
}
```

`status: "grading_failed"` lets us persist the student's raw answers even if the LLM call fails, instead of losing the submission.

## Implementation checklist

### Backend

- [x] **Config layer** (`config/azureOpenAIConfig.js`) — reads `AZURE_OPENAI_ENDPOINT` / `KEY` / `VERSION` / `DEPLOYMENT` from env, throws listing missing var names; called at startup in `app.js` so the server fails fast. TDD, with `env` injectable for pure tests.
- [x] **LLM client** (`services/azureOpenAiClient.js`) — builds one batched prompt per submission (question + rubric + student answer for each question), calls Azure OpenAI chat completions via injected `fetchImpl`, parses/validates strict JSON response `{questionId, score, feedback}[]`, throws a descriptive error on malformed output or a non-OK HTTP response. No Mongo/Express imports. TDD, with a fake `fetchImpl` so tests never hit the network.
- [x] **Grading service** (`services/gradingService.js`) — takes answers + matching questions, calls an injected LLM client, maps results back onto question IDs, computes `overallScore`, returns the normalized graded-submission shape. No HTTP imports. TDD, with a fake LLM client.
- [x] **Repositories** (`repositories/questionsRepository.js`, `repositories/submissionsRepository.js`) — thin Mongo wrappers (`sample`/`findByIds`/`save`). Not unit-tested: one-line driver calls, meaningfully testing them needs a real/in-memory Mongo, which is disproportionate here.
- [x] **Submission service** (`services/submissionService.js`) — orchestrates repositories + grading service: looks up matching questions, grades, and on grading failure persists the raw answers as `status: "grading_failed"` before throwing `AppError.gradingFailed(submissionId)`; on success persists `status: "graded"` and returns it. TDD, with fake repositories/grading service.
- [x] **Controllers + `POST /submit`** (`controllers/submissionsController.js`, `routes/submissions.js`) — thin HTTP glue: validates input, delegates to `submissionService`, shapes the response. No per-error-type branching — the global `errorHandler` shapes `AppError`s (including the 502 for `grading_failed`) generically from the error's own fields. Lightly tested with fake req/res/service.
- [ ] **Add `GET /submissions/:studentId`** — returns that student's submissions sorted by `submittedAt` desc (serves both "latest result" and "history"). *Deferred.*

### Backend architecture layer (added beyond the original plan)

- [x] **Error handling** (`utils/errors.js`, `middleware/errorHandler.js`) — single `AppError` class with `validation()`/`gradingFailed()` factory methods (Boom-style, not a subclass hierarchy) + `asyncHandler`/`errorHandler` middleware, replacing ad-hoc `try/catch { res.status(500)... }` in routes.
- [x] **Layering** — `routes -> controllers -> services -> repositories -> db`, with dependencies composed in `app.js` (the composition root) and injected via factory functions everywhere, so every layer except the Mongo repositories is unit-testable in isolation.

### Frontend

- [ ] **`examApi.js`** — add `fetchSubmissions(studentId)`.
- [ ] **Results view** — after submit, show overall score + each question with the student's answer, score, and feedback (new `GradedQuestion`/`ResultCard` component, reusing `Question`'s layout read-only).
- [ ] **History view (optional feature)** — simple tab/toggle in `App.jsx` between "Take Exam" and "History" (no router needed); `SubmissionHistory` component lists past attempts with date + score, expandable for feedback.

## Notes

- `.env` is already gitignored — Azure key is safe from being committed.
- `nodejs/client/src/api/examApi.js` points at port `5001`, matching `PORT=5001` in `nodejs/server/.env` — consistent.
