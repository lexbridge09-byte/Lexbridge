import { Router } from 'express';
import { z } from 'zod';
import {
  IS_RAZORPAY_CONFIGURED,
  IS_WHATSAPP_AGENT_CONFIGURED,
  WHATSAPP_AI_FREE_MESSAGES,
  WHATSAPP_AI_PACK_MESSAGES,
  WHATSAPP_AI_PACK_PRICE_PAISE,
} from '../../config/index.js';
import {
  CREDIT_GRANT_HISTORY_LIMIT,
  WHATSAPP_PAYMENT_STATUSES,
  WhatsAppContactModel,
  WhatsAppMessageModel,
  WhatsAppPaymentModel,
} from '../../models/index.js';
import { createHttpError, escapeRegex, objectIdSchema, paginationSchema } from '../../utils.js';

const CONTACT_LIST_FIELDS = 'Phone ProfileName FreeMessagesUsed PaidMessagesRemaining IsOptedOut LastInboundAt createdAt';
const CONTACT_DETAIL_FIELDS = `${CONTACT_LIST_FIELDS} ConsentNoticeSentAt optedOutAt LastSuggestedCategory LastHandoffReference lastHandoffAt CreditGrants updatedAt`;
const MAX_DETAIL_PAYMENTS = 50;

const contactListQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
});

const messagePageSchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const grantCreditsSchema = z.object({
  Messages: z.number().int().min(1, 'Grant at least 1 question').max(500, 'Grant at most 500 questions at a time'),
  Reason: z.string().trim().min(3, 'Add a short reason').max(200),
});

const paymentListQuerySchema = paginationSchema.extend({
  status: z.enum(WHATSAPP_PAYMENT_STATUSES).optional(),
});

function withQuestionsLeft(contact) {
  return {
    ...contact,
    FreeMessagesRemaining: Math.max(0, WHATSAPP_AI_FREE_MESSAGES - contact.FreeMessagesUsed),
  };
}

// Digits match the phone number (last 10 digits exact, or a prefix of them); anything else is a name prefix
function deriveContactFilter(query) {
  const digits = query.replace(/\D/g, '');
  if (/^[+\d\s()-]+$/.test(query) && digits.length >= 4) {
    return digits.length >= 10 ? { PhoneLast10: digits.slice(-10) } : { PhoneLast10: { $regex: `^${digits}` } };
  }
  return { ProfileName: { $regex: `^${escapeRegex(query)}`, $options: 'i' } };
}

export const adminWhatsAppRouter = Router();

adminWhatsAppRouter.get('/status', (req, res) => {
  res.json({
    isWhatsAppConfigured: IS_WHATSAPP_AGENT_CONFIGURED,
    isPaymentsConfigured: IS_RAZORPAY_CONFIGURED,
    plan: {
      freeMessages: WHATSAPP_AI_FREE_MESSAGES,
      packMessages: WHATSAPP_AI_PACK_MESSAGES,
      packPricePaise: WHATSAPP_AI_PACK_PRICE_PAISE,
    },
  });
});

adminWhatsAppRouter.get('/contacts', async (req, res) => {
  const { page, limit, q } = contactListQuerySchema.parse(req.query);
  const filter = q ? deriveContactFilter(q) : {};

  const [items, total] = await Promise.all([
    WhatsAppContactModel.find(filter)
      .select(CONTACT_LIST_FIELDS)
      .sort({ LastInboundAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WhatsAppContactModel.countDocuments(filter),
  ]);
  res.json({ items: items.map(withQuestionsLeft), total, page, limit });
});

adminWhatsAppRouter.get('/contacts/:id', async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const { page, limit } = messagePageSchema.parse(req.query);

  const contact = await WhatsAppContactModel.findById(id)
    .select(CONTACT_DETAIL_FIELDS)
    .populate('CreditGrants.GrantedBy', 'FullName Email')
    .lean();
  if (!contact) throw createHttpError(404, 'WhatsApp contact not found');

  const [messages, totalMessages, payments] = await Promise.all([
    WhatsAppMessageModel.find({ Contact: id })
      .select('Direction Kind Body MessageType ChargeType createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WhatsAppMessageModel.countDocuments({ Contact: id }),
    WhatsAppPaymentModel.find({ Contact: id })
      .select('Status AmountPaise MessagesGranted ShortUrl RazorpayPaymentLinkId RazorpayPaymentId paidAt linkExpiresAt createdAt')
      .sort({ createdAt: -1 })
      .limit(MAX_DETAIL_PAYMENTS)
      .lean(),
  ]);

  res.json({
    contact: withQuestionsLeft(contact),
    messages: { items: messages, total: totalMessages, page, limit },
    payments,
  });
});

adminWhatsAppRouter.post('/contacts/:id/credits', async (req, res) => {
  const id = objectIdSchema.parse(req.params.id);
  const { Messages, Reason } = grantCreditsSchema.parse(req.body);

  const contact = await WhatsAppContactModel.findByIdAndUpdate(
    id,
    {
      $inc: { PaidMessagesRemaining: Messages },
      $push: {
        CreditGrants: {
          $each: [{ Messages, Reason, GrantedBy: req.user.id, grantedAt: new Date() }],
          $slice: -CREDIT_GRANT_HISTORY_LIMIT,
        },
      },
    },
    { returnDocument: 'after', projection: CONTACT_DETAIL_FIELDS },
  ).lean();
  if (!contact) throw createHttpError(404, 'WhatsApp contact not found');

  req.log.info({ contactId: id, messages: Messages, adminId: req.user.id }, '[admin] WhatsApp questions granted');
  res.status(201).json({ contact: withQuestionsLeft(contact) });
});

adminWhatsAppRouter.get('/payments', async (req, res) => {
  const { page, limit, status } = paymentListQuerySchema.parse(req.query);
  const filter = status ? { Status: status } : {};

  const [items, total] = await Promise.all([
    WhatsAppPaymentModel.find(filter)
      .select('Contact Status AmountPaise MessagesGranted RazorpayPaymentLinkId RazorpayPaymentId paidAt linkExpiresAt createdAt')
      .populate('Contact', 'Phone ProfileName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    WhatsAppPaymentModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});
