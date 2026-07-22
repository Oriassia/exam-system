import express from 'express';
import { createSubmissionsController } from '../controllers/submissionsController.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Route wiring only - no Mongo/LLM/business logic here. The controller
 * and its dependencies are composed in app.js.
 */
export function createSubmissionsRouter({ submissionService }) {
  const router = express.Router();
  const controller = createSubmissionsController({ submissionService });

  router.post('/submit', asyncHandler(controller.submit));
  router.get('/submissions/:studentId', asyncHandler(controller.getByStudentId));

  return router;
}
