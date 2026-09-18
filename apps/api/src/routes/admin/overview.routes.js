import { Router } from 'express';
import { REQUEST_STATUSES } from '@lexbridge/shared';
import { isFeatureEnabled } from '../../brand/index.js';
import {
  ArticleModel,
  CallbackRequestModel,
  ConsultationModel,
  DocumentReviewModel,
  OrderModel,
  ServiceRequestModel,
  SlotModel,
} from '../../models/index.js';
import { startOfIstDay } from '../../utils.js';

const CLOSED_REQUEST_STATUSES = new Set(['completed', 'closed']);

// Orders paid since the start of today in India; revenue is the amount collected, before any refunds
async function summarisePaidOrders(since) {
  const [summary] = await OrderModel.aggregate([
    { $match: { paidAt: { $gte: since } } },
    { $group: { _id: null, count: { $sum: 1 }, revenuePaise: { $sum: '$TotalPaise' } } },
  ]);
  return { count: summary?.count ?? 0, revenuePaise: summary?.revenuePaise ?? 0 };
}

export const adminOverviewRouter = Router();

adminOverviewRouter.get('/', async (req, res) => {
  const now = new Date();
  const todayStart = startOfIstDay(now);
  // One index-backed count per status instead of grouping the whole collection.
  // Counts for switched-off features are null so the admin panel can hide them.
  const [statusCounts, upcomingConsultations, openSlots, publishedArticles, paidOrders, openCallbacks, documentReviewsToday] = await Promise.all([
    Promise.all(REQUEST_STATUSES.map((status) => ServiceRequestModel.countDocuments({ Status: status }))),
    ConsultationModel.countDocuments({ Status: 'scheduled', StartsAt: { $gt: now } }),
    SlotModel.countDocuments({ Status: 'open', StartsAt: { $gt: now } }),
    ArticleModel.countDocuments({ Status: 'published' }),
    isFeatureEnabled('onlinePayments') ? summarisePaidOrders(todayStart) : null,
    isFeatureEnabled('callbackRequests') ? CallbackRequestModel.countDocuments({ Status: 'new' }) : null,
    isFeatureEnabled('aiDocumentReview') ? DocumentReviewModel.countDocuments({ createdAt: { $gte: todayStart } }) : null,
  ]);

  const requestsByStatus = Object.fromEntries(REQUEST_STATUSES.map((status, index) => [status, statusCounts[index]]));
  const openRequests = REQUEST_STATUSES
    .filter((status) => !CLOSED_REQUEST_STATUSES.has(status))
    .reduce((sum, status) => sum + requestsByStatus[status], 0);

  res.json({
    counts: {
      openRequests,
      requestsByStatus,
      upcomingConsultations,
      openSlots,
      publishedArticles,
      ordersPaidToday: paidOrders?.count ?? null,
      revenuePaidTodayPaise: paidOrders?.revenuePaise ?? null,
      openCallbacks,
      documentReviewsToday,
    },
  });
});
