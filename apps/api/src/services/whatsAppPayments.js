import { logger } from '../logger.js';
import {
  APPLIED_PAYMENT_HISTORY_LIMIT,
  WhatsAppContactModel,
  WhatsAppPaymentModel,
} from '../models/index.js';
import { createPaymentConfirmationText, recordOutboundMessage } from './whatsAppAgent.js';
import { sendWhatsAppText } from './whatsappService.js';

// Free-form messages can only be sent within 24 hours of the person's last message
const CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

async function sendPaymentConfirmation(contact, payment) {
  if (contact.IsOptedOut) return;
  const lastInboundAt = contact.LastInboundAt ? new Date(contact.LastInboundAt).getTime() : 0;
  if (Date.now() - lastInboundAt > CUSTOMER_SERVICE_WINDOW_MS) {
    // Outside the window only approved templates are allowed; the questions are still credited
    logger.info({ contactId: String(contact._id) }, '[whatsapp-agent] payment confirmation skipped: outside the 24-hour window');
    return;
  }

  const body = createPaymentConfirmationText(payment.MessagesGranted, contact);
  const result = await sendWhatsAppText({ to: contact.Phone, body });
  if (result.status === 'failed') {
    logger.warn({ contactId: String(contact._id), error: result.error }, '[whatsapp-agent] payment confirmation failed to send');
    return;
  }
  await recordOutboundMessage({ contactId: contact._id, body, kind: 'system', waMessageId: result.messageId });
}

/*
  Applies a verified Razorpay webhook event. Safe to run more than once for the same event:
  the credit is a single conditional update that only succeeds if this payment link hasn't been applied.
  Returns a short outcome string for logs and the webhook response.
*/
export async function applyRazorpayWebhookEvent(event) {
  const eventName = event?.event;
  const link = event?.payload?.payment_link?.entity;
  if (typeof link?.id !== 'string') return 'ignored';

  const payment = await WhatsAppPaymentModel.findOne({ RazorpayPaymentLinkId: link.id }).lean();
  if (!payment) return 'unknown-payment-link';

  if (eventName === 'payment_link.paid') {
    const amountPaid = Number(link.amount_paid ?? 0);
    if (amountPaid < payment.AmountPaise) {
      logger.error(
        { paymentLinkId: link.id, amountPaid, expected: payment.AmountPaise },
        '[whatsapp-agent] payment amount lower than expected; not credited',
      );
      return 'amount-mismatch';
    }

    const creditedContact = await WhatsAppContactModel.findOneAndUpdate(
      { _id: payment.Contact, AppliedPaymentLinkIds: { $ne: link.id } },
      {
        $inc: { PaidMessagesRemaining: payment.MessagesGranted },
        $push: { AppliedPaymentLinkIds: { $each: [link.id], $slice: -APPLIED_PAYMENT_HISTORY_LIMIT } },
      },
      { returnDocument: 'after' },
    ).lean();

    const paymentUpdate = { Status: 'paid', paidAt: payment.paidAt ?? new Date() };
    const razorpayPaymentId = event.payload?.payment?.entity?.id;
    if (typeof razorpayPaymentId === 'string') paymentUpdate.RazorpayPaymentId = razorpayPaymentId;
    if (creditedContact) paymentUpdate.creditedAt = new Date();
    await WhatsAppPaymentModel.updateOne({ _id: payment._id }, { $set: paymentUpdate });

    if (!creditedContact) return 'already-credited';
    logger.info(
      { contactId: String(payment.Contact), paymentLinkId: link.id, messages: payment.MessagesGranted },
      '[whatsapp-agent] question pack credited',
    );
    await sendPaymentConfirmation(creditedContact, payment);
    return 'credited';
  }

  if (eventName === 'payment_link.expired' || eventName === 'payment_link.cancelled') {
    await WhatsAppPaymentModel.updateOne(
      { _id: payment._id, Status: 'created' },
      { $set: { Status: eventName === 'payment_link.expired' ? 'expired' : 'cancelled' } },
    );
    return 'status-updated';
  }

  return 'ignored';
}
