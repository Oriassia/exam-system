# Interview notes — what we built vs the starter

Started from the thin skeleton ([Exam-Generator-AI/exam-system](https://github.com/Exam-Generator-AI/exam-system)): view questions, submit answers, no grading, dual Python/Node trees. We kept **Node + React only**, flattened to `client/` + `server/`, and added auto-grading end-to-end.

---

## LLM grading

1. LLM gets question text, student answer, and a **binary rubric** (`criteria[{ id, description }]`). For each criterion it returns `{ criterionId, quote, satisfied }` — **no numeric scores from the model**.
2. **Our code** turns that into points: `quality = satisfiedCount / criteriaCount`, then `points = quality * (100 / questionCount)`. Overall = sum of unrounded per-question points (rounded once at the end → perfect exam hits exactly 100).
3. Feedback string is also built in code (`Met: … / Missing: …`) from the same evaluations — not free-form LLM prose as the score source.
4. **One batched call** per submission (all Q+A+rubrics in one prompt), `response_format: json_object`, few-shot in the system prompt.
5. **Retry + exponential backoff** (up to 3 attempts) on transient failures: HTTP 429/502/503/504, network errors, empty content. Delay ≈ `200 * 4^(attempt-1)` + jitter.
6. Non-retryable / exhausted retries → submit still **saves raw answers** as `status: "grading_failed"` and returns **502** with `submissionId` (answers not lost).

## Submit flow (`POST /submit`)

1. Validate `studentId` + non-empty `answers`.
2. Load matching questions (+ rubrics) from Mongo by `questionId`.
3. Call `gradeSubmission` → `gradeAnswers` (LLM) → score math.
4. Persist graded doc (`status: "graded"`, `overallScore`, per-answer `score`/`maxScore`/`feedback`/`questionText`) or the failed path above.
5. Sync response: client shows `ResultsView` immediately from the same response.

## Questions (`GET /questions`)

1. Mongo `$sample` of **5** questions each request — random set/order so exams aren’t identical.
2. Each question ships a structured rubric used only server-side at grade time (client doesn’t need it to display the exam).

## History (`GET /submissions/:studentId`)

1. Guarded by static **`X-API-Key`** (`apiKeyAuth`) — timing-safe compare vs `SUBMISSIONS_API_KEY`.
2. Sorted newest-first; maps `_id` → string `id`.
3. **`questionText` denormalized** onto each graded answer at submit time so history doesn’t depend on the current sampled `/questions` set; older rows without it get a fallback lookup from the question bank.

## Frontend

1. **React Router**: `/exam`, `/history`, `/history/:submissionId` — browser back/forward works (starter used plain `useState` “pages”).
2. **ResultsView / GradedQuestion** — overall score + per-question answer, score badge, feedback; shared by live submit and history detail.
3. **HistoryPage** — lookup by student ID, list summary (date, grade, attempt #, grading-failed badge), drill into detail or a short failed-grading message.
4. **ScreenLoader** while submit/grading is in flight.
5. Retake clears result and reloads a fresh sampled exam.

## Backend shape / quality

1. Thin stack: `routes → services → db` (no controllers/repos/DI factories).
2. Boundary: `llm.js` = Azure only; `grading.js` = orchestration + scoring math (LLM client injectable for tests).
3. Fail-fast config at startup for Azure OpenAI + API key env vars.
4. Unit tests (`node:test`): `llm.test.js` (parse, retry/backoff), `grading.test.js` (criteria scoring, feedback, overall math).
5. Extra CS question bank via `db/seedCsQuestions.js` (upserts structured rubrics).

---

## Suggestions (noticed, not implemented)

- **No real student identity** — `studentId` is free text; no users collection, no verification, duplicates/fakes allowed.
- **Auth only on history** — `GET /questions` and `POST /submit` are still open; anyone who can hit the port can read the bank or submit as anyone.
- **Frontend error `code` mismatch** — ExamPage still branches on `VALIDATION_ERROR` / `GRADING_FAILED`, but the route returns plain `{ error, submissionId? }` without `code` (so those specific messages may never show).
- **History deep-link fragility** — hard refresh on `/history/:submissionId` without a prior fetch falls back to the search form (selected row isn’t loaded from the URL alone).
- **Equal weights only** — all questions share `100 / N`; all criteria inside a question weigh the same. No per-criterion or per-question weights.
- **Sync grading only** — long LLM latency blocks the request; no queue / async job + poll.
- **No rate limiting / answer length caps** — abuse and oversized prompts not guarded.
- **Limited test surface** — unit tests for LLM + grading math only; no route/integration/e2e tests.
- **Centralized errors dropped** — earlier `AppError` + global handler were removed; routes use local try/catch and ad-hoc status codes.
- **Sample size fixed at 5** — earlier `?count=N` was removed; not configurable without a code change.
