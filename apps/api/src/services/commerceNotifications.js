import { CALLBACK_TIME_WINDOWS, SERVICE_CATALOG, SUPPORTED_LANGUAGES } from '@lexbridge/shared';
import { EMAIL_COPY } from '../brand/index.js';
import { ADMIN_EMAILS, WHATSAPP_TEMPLATES } from '../config/index.js';
import { formatRupees } from '../utils.js';
import { createEmailJob, createWhatsAppJob, findLabel } from './notificationJobs.js';
import { enqueueNotifications } from './notificationQueue.js';

// Queue-only, like the other notify* functions: they resolve once stored and never throw

export function notifyOrderPaid(order) {
  const itemTitles = order.Items.map((item) => item.TitleSnapshot);
  return enqueueNotifications('order-paid', [
    createEmailJob({
      to: order.Email,
      ...EMAIL_COPY.orderPaid({
        fullName: order.FullName,
        orderReference: order.ReferenceCode,
        requestReference: order.ServiceRequestReference,
        itemTitles,
        totalText: formatRupees(order.TotalPaise),
      }),
    }),
    createWhatsAppJob(order.WhatsAppOptIn, {
      to: order.Phone,
      templateName: WHATSAPP_TEMPLATES.orderPaid,
      bodyParams: [order.FullName, order.ReferenceCode, itemTitles.join(', ').slice(0, 200)],
    }),
  ]);
}

export function notifyOrderRefunded(order, refundPaise) {
  return enqueueNotifications('order-refunded', [
    createEmailJob({
      to: order.Email,
      ...EMAIL_COPY.orderRefunded({
        fullName: order.FullName,
        orderReference: order.ReferenceCode,
        refundText: formatRupees(refundPaise),
        isFullRefund: order.RefundedPaise >= order.TotalPaise,
      }),
    }),
  ]);
}

export function notifyDocumentReviewFinished(review, owner) {
  const buildCopy = review.Status === 'completed' ? EMAIL_COPY.documentReviewReady : EMAIL_COPY.documentReviewFailed;
  return enqueueNotifications(`document-review-${review.Status}`, [
    createEmailJob({
      to: owner?.Email,
      ...buildCopy({
        fullName: owner?.FullName || 'there',
        reviewReference: review.ReferenceCode,
        originalName: review.OriginalName,
      }),
    }),
  ]);
}

export function notifyCallbackRequested(callback) {
  const copy = EMAIL_COPY.callbackRequested({
    fullName: callback.FullName,
    phone: callback.Phone,
    callbackReference: callback.ReferenceCode,
    preferredTimeLabel: findLabel(CALLBACK_TIME_WINDOWS, callback.PreferredTime),
    languageLabel: findLabel(SUPPORTED_LANGUAGES, callback.PreferredLanguage),
    serviceLabel: findLabel(SERVICE_CATALOG, callback.ServiceCategory),
    topic: callback.Topic,
  });
  return enqueueNotifications('callback-requested', [...ADMIN_EMAILS].map((email) => createEmailJob({ to: email, ...copy })));
}
