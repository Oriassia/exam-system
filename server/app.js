import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/database.js';
import { getAzureOpenAIConfig, getApiKeyConfig } from './config.js';
import { createAzureOpenAiClient } from './services/azureOpenAiClient.js';
import { createGradingService } from './services/gradingService.js';
import { createSubmissionService } from './services/submissionService.js';
import { questionsService } from './services/questionsService.js';
import { createQuestionsRouter } from './routes/questions.js';
import { createSubmissionsRouter } from './routes/submissions.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createApiKeyAuth } from './middleware/apiKeyAuth.js';

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
    const apiKeyConfig = getApiKeyConfig();

    const llmClient = createAzureOpenAiClient({ config: azureOpenAIConfig });
    const gradingService = createGradingService({ llmClient });
    const submissionService = createSubmissionService({ questionsService, gradingService });
    const apiKeyAuth = createApiKeyAuth({ apiKey: apiKeyConfig.submissionsApiKey });

    app.use('/', createQuestionsRouter({ questionsService }));
    app.use('/', createSubmissionsRouter({ submissionService, apiKeyAuth }));

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
