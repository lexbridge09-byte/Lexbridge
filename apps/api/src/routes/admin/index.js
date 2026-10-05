import { Router } from 'express';
import { requireFeature, requireManager, requireOwner, requireStaff } from '../../middleware/index.js';
import { adminArticlesRouter } from './articles.routes.js';
import { adminCallbacksRouter } from './callbacks.routes.js';
import { adminConsultationsRouter } from './consultations.routes.js';
import { adminCouponsRouter } from './coupons.routes.js';
import { adminDocumentReviewsRouter } from './documentReviews.routes.js';
import { adminDocumentsRouter } from './documents.routes.js';
import { adminOrdersRouter } from './orders.routes.js';
import { adminOverviewRouter } from './overview.routes.js';
import { adminProductsRouter } from './products.routes.js';
import { adminServiceRequestsRouter } from './serviceRequests.routes.js';
import { adminSlotsRouter } from './slots.routes.js';
import { adminUsersRouter } from './users.routes.js';
import { adminWhatsAppRouter } from './whatsapp.routes.js';

export const adminRouter = Router();

// Anything under /admin needs a staff role; each area is then gated narrower.
adminRouter.use(requireStaff);

// Owner only: commerce, content, user management and every other back-office area
adminRouter.use('/overview', requireOwner, adminOverviewRouter);
adminRouter.use('/consultations', requireOwner, requireFeature('consultationBooking'), adminConsultationsRouter);
adminRouter.use('/slots', requireOwner, requireFeature('consultationBooking'), adminSlotsRouter);
adminRouter.use('/articles', requireOwner, requireFeature('legalInsights'), adminArticlesRouter);
adminRouter.use('/users', requireOwner, adminUsersRouter);
adminRouter.use('/whatsapp', requireOwner, requireFeature('whatsAppAiAssistant'), adminWhatsAppRouter);
adminRouter.use('/products', requireOwner, requireFeature('serviceCatalog'), adminProductsRouter);
adminRouter.use('/orders', requireOwner, requireFeature('onlinePayments'), adminOrdersRouter);
adminRouter.use('/coupons', requireOwner, requireFeature('coupons'), adminCouponsRouter);
adminRouter.use('/document-reviews', requireOwner, requireFeature('aiDocumentReview'), adminDocumentReviewsRouter);
adminRouter.use('/callbacks', requireOwner, requireFeature('callbackRequests'), adminCallbacksRouter);

// Manager + owner: the assignment desk — requests and their documents. Nothing else.
adminRouter.use('/service-requests', requireManager, adminServiceRequestsRouter);
adminRouter.use('/documents', requireManager, requireFeature('documentUploads'), adminDocumentsRouter);
