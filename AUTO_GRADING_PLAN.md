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
    { questionId: 1, answer: "...", score: 42.5, maxScore: 50, feedback: "Good example, but missed..." },
    { questionId: 2, answer: "...", score: 30, maxScore: 50, feedback: "..." }
  ],
  overallScore: 72.5,          // derived: sum of per-question points (out of 100 total)
  status: "graded",            // "graded" | "grading_failed"
  submittedAt: Date,
  gradedAt: Date
}
```

`status: "grading_failed"` lets us persist the student's raw answers even if the LLM call fails, instead of losing the submission.

**Scoring model**: the exam is worth 100 points total, split evenly across its questions (`maxScore = 100 / questionCount`, equal weight per question for now — nothing rubric-driven yet). The LLM still grades each answer on a 0-100 *quality* scale; `gradingService` converts that into `points = (quality / 100) * maxScore` per question, so a perfect submission's per-question points always sum to exactly 100. `overallScore` is the sum of the *unrounded* per-question points (rounded once at the end), not an average of already-rounded display scores, to avoid rounding short-falls (e.g. 3 questions at 33.3 each still totals 100, not 99.9).

## Implementation checklist

### Backend

- [x] **Config layer** (`config/azureOpenAIConfig.js`) — reads `AZURE_OPENAI_ENDPOINT` / `KEY` / `VERSION` / `DEPLOYMENT` from env, throws listing missing var names; called at startup in `app.js` so the server fails fast. TDD, with `env` injectable for pure tests.
- [x] **LLM client** (`services/azureOpenAiClient.js`) — builds one batched prompt per submission (question + rubric + student answer for each question), calls Azure OpenAI chat completions via injected `fetchImpl`, parses/validates strict JSON response `{questionId, score, feedback}[]`, throws a descriptive error on malformed output or a non-OK HTTP response. No Mongo/Express imports. TDD, with a fake `fetchImpl` so tests never hit the network.
- [x] **Grading service** (`services/gradingService.js`) — takes answers + matching questions, calls an injected LLM client, maps each 0-100 LLM quality score onto an equal share of the exam's 100 points (`maxScore = 100 / questionCount`), computes `overallScore` as the sum of per-question points, returns the normalized graded-submission shape (`score`/`maxScore`/`feedback` per answer). No HTTP imports. TDD, with a fake LLM client.
- [x] **Repositories** (`repositories/questionsRepository.js`, `repositories/submissionsRepository.js`) — thin Mongo wrappers (`sample`/`findByIds`/`save`). Not unit-tested: one-line driver calls, meaningfully testing them needs a real/in-memory Mongo, which is disproportionate here.
- [x] **Submission service** (`services/submissionService.js`) — orchestrates repositories + grading service: looks up matching questions, grades, and on grading failure persists the raw answers as `status: "grading_failed"` before throwing `AppError.gradingFailed(submissionId)`; on success persists `status: "graded"` and returns it. TDD, with fake repositories/grading service.
- [x] **Controllers + `POST /submit`** (`controllers/submissionsController.js`, `routes/submissions.js`) — thin HTTP glue: validates input, delegates to `submissionService`, shapes the response. No per-error-type branching — the global `errorHandler` shapes `AppError`s (including the 502 for `grading_failed`) generically from the error's own fields. Lightly tested with fake req/res/service.
- [ ] **Add `GET /submissions/:studentId`** — returns that student's submissions sorted by `submittedAt` desc (serves both "latest result" and "history"). *Deferred.*

### Backend architecture layer (added beyond the original plan)

- [x] **Error handling** (`utils/errors.js`, `middleware/errorHandler.js`) — single `AppError` class with `validation()`/`gradingFailed()` factory methods (Boom-style, not a subclass hierarchy) + `asyncHandler`/`errorHandler` middleware, replacing ad-hoc `try/catch { res.status(500)... }` in routes.
- [x] **Layering** — `routes -> controllers -> services -> repositories -> db`, with dependencies composed in `app.js` (the composition root) and injected via factory functions everywhere, so every layer except the Mongo repositories is unit-testable in isolation.

### Frontend

- [x] **Results view** — after a successful submit, `ExamPage` replaces the exam form with a `ResultsView` (`components/ResultsView.jsx`) showing the overall score (out of 100) plus one `GradedQuestion` (`components/GradedQuestion.jsx`) per answer — question text (looked up from the already-loaded `questions` state), the student's submitted answer, a color-banded score badge showing `score/maxScore` (band thresholds computed as a percentage of `maxScore`, since each question's max is `100 / questionCount`, not a flat 100), and the LLM feedback — reusing `Question.css`'s layout read-only. A "Take Another Exam" button (`onRetake`) clears the result and reloads a fresh sampled set of questions.
- [x] **Submit error handling** — `ExamPage.handleSubmit` branches on `err.response.data.code`: `VALIDATION_ERROR` surfaces the backend's own message, `GRADING_FAILED` shows a distinct "answers were saved but grading failed" message with the `submissionId` (without clearing the student's in-progress answers), anything else falls back to the generic submit-failed message.
- [ ] **`examApi.js`** — add `fetchSubmissions(studentId)`. *Deferred — depends on `GET /submissions/:studentId` below.*
- [ ] **History view (optional feature)** — simple tab/toggle in `App.jsx` between "Take Exam" and "History" (no router needed); `SubmissionHistory` component lists past attempts with date + score, expandable for feedback. *Deferred.*

## Notes

- `.env` is already gitignored — Azure key is safe from being committed.
- `nodejs/client/src/api/examApi.js` points at port `5001`, matching `PORT=5001` in `nodejs/server/.env` — consistent.
- **`AZURE_OPENAI_ENDPOINT` gotcha**: this must be the bare resource URL (e.g. `https://<resource>.openai.azure.com`), *not* the full `/openai/deployments/.../chat/completions?api-version=...` path — `azureOpenAiClient.js` appends that path itself, and a full URL in `.env` silently produces a malformed double-appended URL that Azure 404s on.
- **`gpt-5-nano` temperature gotcha**: this deployment only supports the default `temperature` (1) and rejects an explicit `temperature: 0` with a 400. `azureOpenAiClient.js` intentionally omits the `temperature` field from the chat-completions request body for this reason — if the deployment/model changes to one that supports `temperature: 0`, revisit this for more deterministic grading.
- Verified end-to-end against the real Azure OpenAI deployment and MongoDB: `POST /submit` returns `201` with real per-question scores/feedback and a computed `overallScore`.
