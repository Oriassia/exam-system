import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/database.js';
import { getAzureOpenAIConfig, getApiKeyConfig } from './config.js';
import questionsRouter from './routes/questions.js';
import submissionsRouter from './routes/submissions.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Auto-Graded Exam API' });
});

async function startServer() {
  try {
    // Fail fast on a missing/misconfigured env var instead of only
    // discovering it on the first exam submission.
    getAzureOpenAIConfig();
    getApiKeyConfig();

    app.use('/', questionsRouter);
    app.use('/', submissionsRouter);

    // Must be registered after all routes so it can catch their errors.
    app.use(errorHandler);

    await initDb();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
