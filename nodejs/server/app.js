import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/database.js';
import { getAzureOpenAIConfig } from './config/azureOpenAIConfig.js';
import { createAzureOpenAiClient } from './services/azureOpenAiClient.js';
import { createGradingService } from './services/gradingService.js';
import { createSubmissionService } from './services/submissionService.js';
import { questionsRepository } from './repositories/questionsRepository.js';
import { submissionsRepository } from './repositories/submissionsRepository.js';
import { createQuestionsRouter } from './routes/questions.js';
import { createSubmissionsRouter } from './routes/submissions.js';
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

// Initialize database, wire up dependencies, and start server
async function startServer() {
  try {
    // Fail fast on a missing/misconfigured Azure OpenAI env var instead of
    // only discovering it on the first exam submission.
    const azureOpenAIConfig = getAzureOpenAIConfig();

    const llmClient = createAzureOpenAiClient({ config: azureOpenAIConfig });
    const gradingService = createGradingService({ llmClient });
    const submissionService = createSubmissionService({
      questionsRepository,
      submissionsRepository,
      gradingService
    });

    app.use('/', createQuestionsRouter({ questionsRepository }));
    app.use('/', createSubmissionsRouter({ submissionService }));

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
