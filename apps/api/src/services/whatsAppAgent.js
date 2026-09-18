import {
  IS_RAZORPAY_CONFIGURED,
  PUBLIC_SITE_URL,
  WHATSAPP_AI_FREE_MESSAGES,
  WHATSAPP_AI_HISTORY_MESSAGES,
  WHATSAPP_AI_PACK_MESSAGES,
  WHATSAPP_AI_PACK_PRICE_PAISE,
  WHATSAPP_MESSAGE_RETENTION_DAYS,
  WHATSAPP_PAYMENT_LINK_TTL_MINUTES,
} from '../config/index.js';
import { logger } from '../logger.js';
import {
  ServiceRequestModel,
  WhatsAppContactModel,
  WhatsAppInboundJobModel,
  WhatsAppMessageModel,
  WhatsAppPaymentModel,
} from '../models/index.js';
import { createWithUniqueReference, formatIstDateTime } from '../utils.js';
import { createRazorpayPaymentLink } from './razorpayService.js';
import { generateWhatsAppReply } from './whatsAppAssistant.js';
import { markWhatsAppMessageRead } from './whatsappService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// A second handoff within this window points to the same open request instead of creating another
const HANDOFF_REUSE_MS = DAY_MS;
// An unpaid link is reused only if it stays valid at least this long
const PAYMENT_LINK_REUSE_MARGIN_MS = 30 * 60 * 1000;
const HANDOFF_CONTEXT_MESSAGES = 10;
const CLOSED_REQUEST_STATUSES = ['completed', 'closed'];

// Whole-message commands. They never use up a question.
const STOP_COMMANDS = new Set(['stop', 'unsubscribe', 'opt out', 'optout']);
const START_COMMANDS = new Set(['start', 'unstop', 'resume']);
const GREETING_COMMANDS = new Set(['hi', 'hii', 'hello', 'hey', 'namaste', 'help', 'menu']);
const BALANCE_COMMANDS = new Set(['balance', 'credits', 'questions left']);
const BUY_COMMANDS = new Set(['buy', 'pay', 'recharge', 'top up', 'topup']);
const HUMAN_COMMANDS = new Set([
  'human',
  'agent',
  'person',
  'call me',
  'lawyer',
  'talk to a person',
  'talk to a human',
  'speak to a person',
  'talk to a lawyer',
  'speak to a lawyer',
]);

const COMMAND_HINT = 'Reply HUMAN to reach our team, BALANCE to see how many questions you have left, or STOP to opt out.';
const STOP_TEXT = "You've opted out. The LexBridge assistant won't reply to your messages. Send START at any time to turn it back on.";
const UNSUPPORTED_MESSAGE_TEXT = 'The assistant can only read text messages for now. Please type your question. To share a document, reply HUMAN and our team will contact you.';
const APOLOGY_TEXT = "Sorry, the assistant couldn't answer just now. This question hasn't been counted. Please try again in a few minutes, or reply HUMAN to reach our team.";
const REFUSAL_TEXT = "The assistant can't help with that message. This question hasn't been counted. Reply HUMAN if you'd like our team to contact you.";
const PAYMENTS_UNAVAILABLE_TEXT = "You've used all your questions. New question packs aren't available right now. Reply HUMAN and our team will contact you.";

export function normalizeCommand(text) {
  return String(text ?? '').trim().toLowerCase().replace(/[.!?]+$/u, '').replace(/\s+/g, ' ');
}

function formatRupees(paise) {
  const rupees = paise / 100;
  return `₹${Number.isInteger(rupees) ? rupees : rupees.toFixed(2)}`;
}

function formatQuestionCount(count) {
  return `${count} question${count === 1 ? '' : 's'}`;
}

function deriveQuestionsLeft(contact) {
  const free = Math.max(0, WHATSAPP_AI_FREE_MESSAGES - (contact.FreeMessagesUsed ?? 0));
  const paid = Math.max(0, contact.PaidMessagesRemaining ?? 0);
  return { free, paid, total: free + paid };
}

function deriveMessageExpiry() {
  return new Date(Date.now() + WHATSAPP_MESSAGE_RETENTION_DAYS * DAY_MS);
}

function createConsentNotice() {
  return [
    'Welcome to LexBridge on WhatsApp.',
    'This assistant shares general legal information and helps you find the right LexBridge service. It is not legal advice, and LexBridge is not a law firm.',
    `We store your messages to reply to you and to pass your matter to our team if you ask. Privacy policy: ${PUBLIC_SITE_URL}/legal/privacy`,
    `Your first ${formatQuestionCount(WHATSAPP_AI_FREE_MESSAGES)} are free. After that, ${formatRupees(WHATSAPP_AI_PACK_PRICE_PAISE)} gets you ${WHATSAPP_AI_PACK_MESSAGES} more.`,
    COMMAND_HINT,
  ].join('\n\n');
}

function createBalanceText(contact) {
  const questionsLeft = deriveQuestionsLeft(contact);
  if (questionsLeft.total === 0) {
    return `You have no questions left. Reply BUY to get ${WHATSAPP_AI_PACK_MESSAGES} more for ${formatRupees(WHATSAPP_AI_PACK_PRICE_PAISE)}.`;
  }
  return `You have ${formatQuestionCount(questionsLeft.total)} left (${questionsLeft.free} free, ${questionsLeft.paid} paid).`;
}

function createHelpText(contact) {
  return `Type your legal question and the assistant will reply. ${createBalanceText(contact)}\n\n${COMMAND_HINT}`;
}

function createPaymentLinkText(payment) {
  return [
    "You've used all your questions.",
    `Get ${WHATSAPP_AI_PACK_MESSAGES} more for ${formatRupees(payment.AmountPaise)}. Pay securely with Razorpay:\n${payment.ShortUrl}`,
    `The link works until ${formatIstDateTime(payment.linkExpiresAt)}. Your questions are added as soon as the payment goes through.`,
    'Reply HUMAN to reach our team instead.',
  ].join('\n\n');
}

function createHandoffText({ reference, isExisting }) {
  return isExisting
    ? `Your matter is already with the LexBridge team (reference ${reference}). They'll contact you on this number.`
    : `We've passed your matter to the LexBridge team. They'll contact you on this number. Your reference is ${reference}.`;
}

export function createPaymentConfirmationText(messagesGranted, contact) {
  return `Payment received, thank you. ${formatQuestionCount(messagesGranted)} have been added. You now have ${formatQuestionCount(deriveQuestionsLeft(contact).total)} left.`;
}

/*
  Pulls inbound user messages out of a Cloud API webhook payload. Status callbacks (sent, delivered,
  read) are ignored, as are messages addressed to a different business phone number.
*/
export function extractInboundMessages(payload, phoneNumberId) {
  if (payload?.object !== 'whatsapp_business_account') return [];
  const messages = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      if (change?.field !== 'messages' || value?.metadata?.phone_number_id !== phoneNumberId) continue;

      const profileNames = new Map((value.contacts ?? []).map((contact) => [contact?.wa_id, contact?.profile?.name ?? '']));
      for (const message of value.messages ?? []) {
        const phone = String(message?.from ?? '').replace(/\D/g, '');
        if (typeof message?.id !== 'string' || !/^\d{8,15}$/.test(phone)) continue;

        // Quick-reply buttons and list selections carry text the person chose, so they count as text
        let text = '';
        if (message.type === 'text') text = message.text?.body ?? '';
        else if (message.type === 'button') text = message.button?.text ?? '';
        else if (message.type === 'interactive') {
          text = message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title ?? '';
        }
        const timestampMs = Number(message.timestamp) * 1000;

        messages.push({
          WaMessageId: message.id,
          Phone: phone,
          ProfileName: String(profileNames.get(message.from) ?? '').trim().slice(0, 120),
          MessageType: text ? 'text' : String(message.type ?? 'unknown').slice(0, 30),
          Text: String(text).slice(0, 4096),
          ReceivedAt: Number.isFinite(timestampMs) && timestampMs > 0 ? new Date(timestampMs) : new Date(),
        });
      }
    }
  }
  return messages;
}

async function upsertContact(message) {
  const update = {
    $max: { LastInboundAt: message.ReceivedAt },
    $setOnInsert: { PhoneLast10: message.Phone.slice(-10) },
  };
  if (message.ProfileName) update.$set = { ProfileName: message.ProfileName };

  try {
    await WhatsAppContactModel.updateOne({ Phone: message.Phone }, update, { upsert: true });
  } catch (err) {
    // Two deliveries for a new number can race on the unique Phone index; the loser just updates
    if (err?.code !== 11000) throw err;
    await WhatsAppContactModel.updateOne({ Phone: message.Phone }, update);
  }
}

// Stores contacts and queues one job per message. Duplicate deliveries of the same message id are ignored.
export async function ingestInboundMessages(messages) {
  if (messages.length === 0) return { queued: 0 };
  for (const message of messages) await upsertContact(message);

  try {
    const inserted = await WhatsAppInboundJobModel.insertMany(messages, { ordered: false });
    return { queued: inserted.length };
  } catch (err) {
    const writeErrors = err?.writeErrors ?? [];
    const isOnlyDuplicates = writeErrors.length > 0
      ? writeErrors.every((writeError) => (writeError.code ?? writeError.err?.code) === 11000)
      : err?.code === 11000;
    if (!isOnlyDuplicates) throw err;
    return { queued: messages.length - Math.max(writeErrors.length, 1) };
  }
}

async function recordInboundMessage(contactId, job) {
  try {
    return await WhatsAppMessageModel.create({
      Contact: contactId,
      Direction: 'in',
      WaMessageId: job.WaMessageId,
      MessageType: job.MessageType,
      Body: job.Text,
      Kind: 'user',
      expiresAt: deriveMessageExpiry(),
    });
  } catch (err) {
    // Already recorded on an earlier attempt of this job
    if (err?.code !== 11000) throw err;
    return WhatsAppMessageModel.findOne({ WaMessageId: job.WaMessageId });
  }
}

export async function recordOutboundMessage({ contactId, body, kind, waMessageId }) {
  const document = { Contact: contactId, Direction: 'out', Body: body, Kind: kind, expiresAt: deriveMessageExpiry() };
  try {
    await WhatsAppMessageModel.create(waMessageId ? { ...document, WaMessageId: waMessageId } : document);
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
}

async function claimConsentNotice(contactId) {
  const result = await WhatsAppContactModel.updateOne(
    { _id: contactId, ConsentNoticeSentAt: null },
    { $set: { ConsentNoticeSentAt: new Date() } },
  );
  return result.modifiedCount === 1;
}

async function loadConversationHistory(contactId, currentMessageId) {
  const messages = await WhatsAppMessageModel.find({
    Contact: contactId,
    Kind: { $in: ['user', 'assistant'] },
    _id: { $ne: currentMessageId },
  })
    .select('Kind Body')
    .sort({ createdAt: -1 })
    .limit(WHATSAPP_AI_HISTORY_MESSAGES)
    .lean();
  return messages
    .reverse()
    .filter((message) => message.Body)
    .map((message) => ({ role: message.Kind === 'user' ? 'user' : 'assistant', text: message.Body }));
}

/*
  Uses one question: free allowance first, then paid. Each step is a single conditional update, so
  concurrent messages can't spend the same question twice. The charge is stored on the job, so a retried
  job reuses it instead of charging again.
*/
async function consumeQuestion(job, contactId) {
  if (job.ChargeType === 'free' || job.ChargeType === 'paid') return job.ChargeType;

  let chargeType = null;
  const freeCharge = await WhatsAppContactModel.updateOne(
    { _id: contactId, FreeMessagesUsed: { $lt: WHATSAPP_AI_FREE_MESSAGES } },
    { $inc: { FreeMessagesUsed: 1 } },
  );
  if (freeCharge.modifiedCount === 1) {
    chargeType = 'free';
  } else {
    const paidCharge = await WhatsAppContactModel.updateOne(
      { _id: contactId, PaidMessagesRemaining: { $gt: 0 } },
      { $inc: { PaidMessagesRemaining: -1 } },
    );
    if (paidCharge.modifiedCount === 1) chargeType = 'paid';
  }

  if (chargeType) await WhatsAppInboundJobModel.updateOne({ _id: job._id }, { $set: { ChargeType: chargeType } });
  return chargeType;
}

async function refundQuestion(job, contactId, chargeType, inboundMessageId) {
  if (chargeType === 'free') {
    await WhatsAppContactModel.updateOne({ _id: contactId, FreeMessagesUsed: { $gt: 0 } }, { $inc: { FreeMessagesUsed: -1 } });
  } else if (chargeType === 'paid') {
    await WhatsAppContactModel.updateOne({ _id: contactId }, { $inc: { PaidMessagesRemaining: 1 } });
  }
  await WhatsAppInboundJobModel.updateOne({ _id: job._id }, { $set: { ChargeType: 'none' } });
  await WhatsAppMessageModel.updateOne({ _id: inboundMessageId }, { $set: { ChargeType: 'refunded' } });
}

async function createPaymentLinkReply(contact) {
  if (!IS_RAZORPAY_CONFIGURED) return { Kind: 'system', Body: PAYMENTS_UNAVAILABLE_TEXT };

  const now = Date.now();
  let payment = await WhatsAppPaymentModel.findOne({
    Contact: contact._id,
    Status: 'created',
    AmountPaise: WHATSAPP_AI_PACK_PRICE_PAISE,
    MessagesGranted: WHATSAPP_AI_PACK_MESSAGES,
    linkExpiresAt: { $gt: new Date(now + PAYMENT_LINK_REUSE_MARGIN_MS) },
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!payment) {
    // Razorpay allows 40 characters: WA + 24-character contact id + base-36 timestamp
    const referenceId = `WA${String(contact._id)}${now.toString(36)}`.slice(0, 40);
    const linkExpiresAt = new Date(now + WHATSAPP_PAYMENT_LINK_TTL_MINUTES * 60 * 1000);
    const link = await createRazorpayPaymentLink({
      amountPaise: WHATSAPP_AI_PACK_PRICE_PAISE,
      referenceId,
      description: `LexBridge WhatsApp assistant: ${WHATSAPP_AI_PACK_MESSAGES} questions`,
      expiresAt: linkExpiresAt,
      notes: { purpose: 'whatsapp-ai-pack', contactId: String(contact._id) },
    });
    payment = await WhatsAppPaymentModel.create({
      Contact: contact._id,
      RazorpayPaymentLinkId: link.id,
      ReferenceId: referenceId,
      ShortUrl: link.shortUrl,
      AmountPaise: WHATSAPP_AI_PACK_PRICE_PAISE,
      MessagesGranted: WHATSAPP_AI_PACK_MESSAGES,
      linkExpiresAt,
    });
  }
  return { Kind: 'payment-link', Body: createPaymentLinkText(payment) };
}

async function deriveRecentConversationSummary(contactId) {
  const messages = await WhatsAppMessageModel.find({ Contact: contactId, Kind: 'user' })
    .select('Body')
    .sort({ createdAt: -1 })
    .limit(HANDOFF_CONTEXT_MESSAGES)
    .lean();
  if (messages.length === 0) {
    return 'The person asked on WhatsApp to speak with the LexBridge team. They had not asked any questions yet.';
  }
  const lines = messages.reverse().map((message) => `- ${message.Body}`).join('\n');
  return `The person asked on WhatsApp to speak with the LexBridge team. Their recent questions, oldest first:\n${lines}`;
}

// Creates a ServiceRequest for the team, or points to one already open from the last 24 hours
async function handOffToTeam(contact, { summary, category }) {
  const now = new Date();
  const hasRecentHandoff = contact.LastHandoffReference
    && contact.lastHandoffAt
    && now.getTime() - new Date(contact.lastHandoffAt).getTime() < HANDOFF_REUSE_MS;
  if (hasRecentHandoff) {
    const isStillOpen = await ServiceRequestModel.exists({
      ReferenceCode: contact.LastHandoffReference,
      Status: { $nin: CLOSED_REQUEST_STATUSES },
    });
    if (isStillOpen) return { reference: contact.LastHandoffReference, isExisting: true };
  }

  const request = await createWithUniqueReference('LB', (referenceCode) => ServiceRequestModel.create({
    ReferenceCode: referenceCode,
    FullName: contact.ProfileName || 'WhatsApp user',
    Email: '',
    Phone: `+${contact.Phone}`,
    ServiceCategory: category || 'other',
    Subtype: 'WhatsApp assistant',
    Description: summary.slice(0, 5000),
    Source: 'whatsapp-agent',
    StatusHistory: [{ Status: 'submitted', changedAt: now }],
    // They're already talking to us on WhatsApp, so team updates can reach them there
    WhatsAppOptIn: true,
    // The person saw the privacy notice on first contact and chose to continue or asked for the team
    ConsentGiven: true,
    consentedAt: contact.ConsentNoticeSentAt ?? now,
  }));

  await WhatsAppContactModel.updateOne(
    { _id: contact._id },
    { $set: { LastHandoffReference: request.ReferenceCode, lastHandoffAt: now } },
  );
  logger.info({ contactId: String(contact._id), reference: request.ReferenceCode }, '[whatsapp-agent] handed off to team');
  return { reference: request.ReferenceCode, isExisting: false };
}

/*
  Decides the replies to one inbound message and settles its question charge. Returns
  [{ Kind, Body }] for the worker to send. Throwing makes the worker retry the job.
*/
export async function prepareInboundReplies(job) {
  const contact = await WhatsAppContactModel.findOne({ Phone: job.Phone }).lean();
  if (!contact) {
    const error = new Error('WhatsApp contact not found');
    error.isPermanent = true;
    throw error;
  }

  const inboundMessage = await recordInboundMessage(contact._id, job);
  const text = job.MessageType === 'text' ? job.Text.trim() : '';
  const command = normalizeCommand(text);
  // Commands stay out of the AI conversation history
  const markAsCommand = () => WhatsAppMessageModel.updateOne({ _id: inboundMessage._id }, { $set: { Kind: 'system' } });

  if (STOP_COMMANDS.has(command)) {
    await markAsCommand();
    await WhatsAppContactModel.updateOne({ _id: contact._id }, { $set: { IsOptedOut: true, optedOutAt: new Date() } });
    return [{ Kind: 'system', Body: STOP_TEXT }];
  }

  if (START_COMMANDS.has(command)) {
    await markAsCommand();
    await WhatsAppContactModel.updateOne({ _id: contact._id }, { $set: { IsOptedOut: false, optedOutAt: null } });
    const replies = [];
    if (await claimConsentNotice(contact._id)) replies.push({ Kind: 'notice', Body: createConsentNotice() });
    replies.push({ Kind: 'system', Body: `The LexBridge assistant is on again. ${createBalanceText(contact)}` });
    return replies;
  }

  if (contact.IsOptedOut) {
    await markAsCommand();
    return [];
  }

  const replies = [];
  const isFirstContact = await claimConsentNotice(contact._id);
  if (isFirstContact) replies.push({ Kind: 'notice', Body: createConsentNotice() });

  if (!text) {
    await markAsCommand();
    replies.push({ Kind: 'system', Body: UNSUPPORTED_MESSAGE_TEXT });
    return replies;
  }
  if (GREETING_COMMANDS.has(command)) {
    await markAsCommand();
    if (!isFirstContact) replies.push({ Kind: 'system', Body: createHelpText(contact) });
    return replies;
  }
  if (BALANCE_COMMANDS.has(command)) {
    await markAsCommand();
    replies.push({ Kind: 'system', Body: createBalanceText(contact) });
    return replies;
  }
  if (BUY_COMMANDS.has(command)) {
    await markAsCommand();
    replies.push(await createPaymentLinkReply(contact));
    return replies;
  }
  if (HUMAN_COMMANDS.has(command)) {
    await markAsCommand();
    const handoff = await handOffToTeam(contact, {
      summary: await deriveRecentConversationSummary(contact._id),
      category: contact.LastSuggestedCategory,
    });
    replies.push({ Kind: 'handoff', Body: createHandoffText(handoff) });
    return replies;
  }

  const chargeType = await consumeQuestion(job, contact._id);
  if (!chargeType) {
    replies.push(await createPaymentLinkReply(contact));
    return replies;
  }
  await WhatsAppMessageModel.updateOne({ _id: inboundMessage._id }, { $set: { ChargeType: chargeType } });

  let result;
  try {
    await markWhatsAppMessageRead({ messageId: job.WaMessageId, showTyping: true });
    const history = await loadConversationHistory(contact._id, inboundMessage._id);
    result = await generateWhatsAppReply({ history, userText: text });
  } catch (err) {
    logger.error(
      { contactId: String(contact._id), error: err?.message, status: err?.status },
      '[whatsapp-agent] assistant reply failed; question refunded',
    );
    await refundQuestion(job, contact._id, chargeType, inboundMessage._id);
    replies.push({ Kind: 'system', Body: APOLOGY_TEXT });
    return replies;
  }

  if (result.isRefusal) {
    await refundQuestion(job, contact._id, chargeType, inboundMessage._id);
    replies.push({ Kind: 'system', Body: REFUSAL_TEXT });
    return replies;
  }

  await WhatsAppContactModel.updateOne({ _id: contact._id }, { $set: { LastSuggestedCategory: result.suggestedCategory } });

  let replyBody = result.reply;
  if (result.needsHumanHandoff) {
    const handoff = await handOffToTeam(contact, {
      summary: result.handoffSummary || `Question sent on WhatsApp:\n${text}`,
      category: result.suggestedCategory,
    });
    replyBody = `${replyBody}\n\n${createHandoffText(handoff)}`;
  }
  replies.push({ Kind: 'assistant', Body: replyBody.slice(0, 4096) });
  return replies;
}
