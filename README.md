# Exam System — Auto-Graded Exam

A full-stack application for taking open-ended exam questions that are **automatically graded by an LLM** (Azure OpenAI), with per-question feedback and a submission history view.

This started from a minimal skeleton (view questions, submit answers, no grading) and was extended into the auto-grading feature described in [`AUTO_GRADING_PLAN.md`](AUTO_GRADING_PLAN.md). Known follow-up improvements are tracked in [`IMPROVEMENTS.md`](IMPROVEMENTS.md).

## Features

- **Auto-graded exams** — student answers are graded by Azure OpenAI against a per-question rubric, in one batched LLM call per submission, returning a 0-100 quality score and written feedback per question.
- **Results view** — after submitting, the student immediately sees their overall score (out of 100) and per-question feedback.
- **Submission history** — look up a student's past attempts, see grade/date/question-count at a glance, and drill into any past attempt's full graded detail. Backed by real URLs (`/exam`, `/history`, `/history/:submissionId`) so browser back/forward works as expected.
- **Resilient grading** — if the LLM call fails, the student's raw answers are still saved (`status: "grading_failed"`) instead of being lost.
- **Randomized question sampling** — each exam samples a random subset of the question bank (via MongoDB's `$sample`), so students don't all get an identical exam.
- **API key protection** — `GET /submissions/:studentId` requires an `X-API-Key` header, so it can be safely exposed to a trusted external caller in addition to the app's own frontend.

## Tech Stack

- **Frontend**: React 19, Vite, React Router, Axios
- **Backend**: Node.js / Express
- **Database**: MongoDB (local instance), seeded with exam questions (each with a grading rubric) on server startup
- **LLM**: Azure OpenAI (chat completions)

## Project Structure

```
exam-system/
├── client/                       # React frontend
│   ├── src/
│   │   ├── api/examApi.js        # fetchQuestions / submitAnswers / fetchSubmissions
│   │   ├── components/           # Sidebar, QuestionList, ResultsView, GradedQuestion,
│   │   │                         # HistoryList, SubmissionListItem, SubmitButton, ...
│   │   ├── pages/                # ExamPage, HistoryPage
│   │   └── styles/
│   ├── .env                      # VITE_SUBMISSIONS_API_KEY (gitignored)
│   └── vite.config.js
├── server/                       # Express backend
│   ├── routes/                   # questions.js, submissions.js — Mongo queries inline
│   ├── services/                  # grading.js (LLM orchestration + scoring),
│   │                              # llm.js (talks to Azure OpenAI only)
│   ├── middleware/                # errorHandler/asyncHandler, apiKeyAuth
│   ├── config.js                  # azure OpenAI + API key env readers (fail-fast)
│   ├── errors.js                  # single AppError class, Boom-style factory methods
│   ├── db/database.js             # MongoDB connection + startup seeding
│   ├── db/seedCsQuestions.js       # optional script to add more sample questions
│   ├── .env                       # Mongo/Azure OpenAI/API key config (gitignored)
│   └── app.js                     # express setup — mounts routers directly, no DI wiring
├── AUTO_GRADING_PLAN.md               # design + implementation checklist for this feature
├── IMPROVEMENTS.md                    # known follow-up improvements
└── README.md
```

The Node backend is intentionally thin for its 3 endpoints: each route in `routes/` talks to Mongo directly and calls plain functions in `services/` — no controllers, repositories, or `createX({ deps })` factory wiring. `services/grading.js` takes its LLM client as an overridable parameter (defaulting to the real `services/llm.js`), which is enough to unit-test the grading math (`node:test`) without hitting the network.

## Prerequisites

- **Node.js** (v18+) and npm
- **MongoDB** (v4.4+, needed for the `$sample` aggregation used for random question selection)
- An **Azure OpenAI** resource with a deployed chat model (e.g. a `gpt-4o`/`gpt-5-nano`-class deployment)

### Installing MongoDB

**macOS (Homebrew):**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Windows:** download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community) and run the installer; it starts automatically as a Windows service.

Verify MongoDB is running with `mongosh`.

## Setup

### 1. Backend (`server`)

```bash
cd server
npm install
```

Create `server/.env`:

```env
MONGODB_URI=mongodb://localhost:27017/
DB_NAME=exam_system
PORT=5001

# Azure OpenAI — bare resource URL only, NOT the full chat-completions path
AZURE_OPENAI_ENDPOINT="https://<your-resource>.openai.azure.com"
AZURE_OPENAI_KEY="<your-azure-openai-key>"
AZURE_OPENAI_VERSION="2024-12-01-preview"
AZURE_OPENAI_DEPLOYMENT="<your-deployment-name>"

# Protects GET /submissions/:studentId — any long random string
SUBMISSIONS_API_KEY="<generate-with-crypto.randomBytes(32).toString('hex')>"
```

The server fails fast at startup if any required var is missing, and prints exactly which ones. Questions (with rubrics) are seeded automatically into MongoDB the first time it runs; `db/seedCsQuestions.js` can be run separately (`node db/seedCsQuestions.js`) to add a larger CS question bank.

### 2. Frontend (`client`)

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_SUBMISSIONS_API_KEY="<same value as SUBMISSIONS_API_KEY above>"
```

### 3. Running

**Terminal 1 — backend:**

```bash
cd server
npm start
# or, for auto-reload on file changes:
npm run dev
```

✅ Backend running on http://localhost:5001

**Terminal 2 — frontend:**

```bash
cd client
npm run dev
```

✅ Frontend running on http://localhost:3000

### 4. Testing / linting

```bash
cd server && npm test    # node:test — grading service math
cd client && npm run lint
```

## Usage

1. **Take Exam** — enter a Student ID, answer the sampled questions, and submit.
2. **Grading** — the server fetches the matching questions/rubrics, sends everything to Azure OpenAI in one call, and returns a graded result in the same response (synchronous).
3. **Results** — see the overall score (out of 100) plus feedback for each question, right after submitting.
4. **History** — switch to the History tab, enter a Student ID, and browse past attempts; click one to see its full graded detail. Back/forward navigation works via the browser as usual.

## Troubleshooting

**MongoDB connection refused** — ensure MongoDB is running (`mongosh`) on the default port `27017`, and that `MONGODB_URI` in `.env` is correct.

**Server exits immediately with "Missing required environment variable(s)"** — one of the required `.env` vars (Azure OpenAI or `SUBMISSIONS_API_KEY`) is unset; the error message lists exactly which ones.

**Azure OpenAI requests 404** — `AZURE_OPENAI_ENDPOINT` must be the bare resource URL (`https://<resource>.openai.azure.com`), not the full `/openai/deployments/.../chat/completions` path — the client appends that itself.

**Azure OpenAI requests fail with a 400 about `temperature`** — some deployments (e.g. `gpt-5-nano`) only support the default `temperature` (1); the client intentionally omits `temperature` from the request for this reason.

**`GET /submissions/:studentId` returns 401** — the caller is missing the `X-API-Key` header or sent the wrong value. The frontend reads it from `VITE_SUBMISSIONS_API_KEY`, which requires restarting the Vite dev server after creating/changing `client/.env` (Vite only reads env files at startup).

**Port already in use** — change `PORT` in `server/.env` and update `API_BASE_URL` in `client/src/api/examApi.js` to match.

**Node module errors:**

```bash
cd server   # or client
rm -rf node_modules package-lock.json
npm install
```

## Notes

- `.env` files (both server and client) are gitignored — no secrets are committed.
- `client/src/api/examApi.js` points at `http://localhost:5001`, matching `PORT=5001` in `server/.env`.
- CORS is enabled for all origins on the backend (suitable for local development, not for production as-is).
- See [`AUTO_GRADING_PLAN.md`](AUTO_GRADING_PLAN.md) for the full design/decision log and [`IMPROVEMENTS.md`](IMPROVEMENTS.md) for known gaps (e.g. `GET /questions` and `POST /submit` still have no auth, and there's no real student identity/account system yet).
