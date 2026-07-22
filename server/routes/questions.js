import express from 'express';
import { createQuestionsController } from '../controllers/questionsController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Route wiring only - no Mongo or business logic here. The controller
 * and its dependencies are composed in app.js.
 */
export function createQuestionsRouter({ questionsRepository }) {
  const router = express.Router();
  const controller = createQuestionsController({ questionsRepository });

  router.get('/questions', asyncHandler(controller.getQuestions));

  return router;
}
