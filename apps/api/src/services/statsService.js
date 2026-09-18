import { CallbackRequestModel, ConsultationModel, DocumentReviewModel, ServiceRequestModel } from '../models/index.js';

// Public numbers change slowly, so each process recomputes them at most once a minute
const CACHE_TTL_MS = 60 * 1000;

let cachedStats = null;
let cachedAt = 0;

// Only real counts from the database. The website decides whether they're large enough to show.
export async function getPublicStats() {
  if (cachedStats && Date.now() - cachedAt < CACHE_TTL_MS) return cachedStats;

  const [completedRequests, closedRequests, consultationsCompleted, documentsReviewed] = await Promise.all([
    ServiceRequestModel.countDocuments({ Status: 'completed' }),
    ServiceRequestModel.countDocuments({ Status: 'closed' }),
    ConsultationModel.countDocuments({ Status: 'completed' }),
    DocumentReviewModel.countDocuments({ Status: 'completed' }),
  ]);

  cachedStats = {
    requestsResolved: completedRequests + closedRequests,
    consultationsCompleted,
    documentsReviewed,
    generatedAt: new Date().toISOString(),
  };
  cachedAt = Date.now();
  return cachedStats;
}

export function countOpenCallbacks() {
  return CallbackRequestModel.countDocuments({ Status: 'new' });
}
