import { Router } from 'express';
import { getEnabledFeatures } from '../brand/index.js';
import { isDbReachable } from '../db/index.js';
import { requireFeature } from '../middleware/index.js';
import { adminRouter } from './admin/index.js';
import { articlesRouter } from './articles.routes.js';
import { authRouter } from './auth.routes.js';
import { callbacksRouter } from './callbacks.routes.js';
import { checkoutRouter } from './checkout.routes.js';
import { consultationsRouter } from './consultations.routes.js';
import { documentReviewsRouter } from './documentReviews.routes.js';
import { documentsRouter } from './documents.routes.js';
import { ordersRouter } from './orders.routes.js';
import { productsRouter } from './products.routes.js';
import { serviceRequestsRouter } from './serviceRequests.routes.js';
import { solutionFinderRouter } from './solutionFinder.routes.js';
import { statsRouter } from './stats.routes.js';
import { webhooksRouter } from './webhooks.routes.js';

export const apiRouter = Router();

// Liveness: the process is up and serving HTTP
apiRouter.get('/health', (req, res) => res.json({ ok: true }));

// Readiness: this instance can serve traffic (database reachable, not shutting down)
apiRouter.get('/ready', async (req, res) => {
  if (req.app.locals.isShuttingDown) {
    return res.status(503).json({ ok: false, db: 'unknown', reason: 'shutting down' });
  }
  const isDbReady = await isDbReachable();
  res.status(isDbReady ? 200 : 503).json({ ok: isDbReady, db: isDbReady ? 'up' : 'down' });
});

// Effective feature switches, so clients can hide what is turned off
apiRouter.get('/features', (req, res) => res.json({ features: getEnabledFeatures() }));

apiRouter.use('/auth', authRouter);
apiRouter.use('/service-requests', serviceRequestsRouter);
apiRouter.use('/solution-finder', requireFeature('solutionFinder'), solutionFinderRouter);
apiRouter.use('/consultations', requireFeature('consultationBooking'), consultationsRouter);
apiRouter.use('/documents', requireFeature('documentUploads'), documentsRouter);
apiRouter.use('/articles', requireFeature('legalInsights'), articlesRouter);
apiRouter.use('/stats', statsRouter);
apiRouter.use('/products', requireFeature('serviceCatalog'), productsRouter);
apiRouter.use('/checkout', requireFeature('onlinePayments'), checkoutRouter);
apiRouter.use('/orders', requireFeature('onlinePayments'), ordersRouter);
apiRouter.use('/document-reviews', requireFeature('aiDocumentReview'), documentReviewsRouter);
apiRouter.use('/callbacks', requireFeature('callbackRequests'), callbacksRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/webhooks', webhooksRouter);
