import { BRAND } from './brandConfig.js';

// Wording of API-generated emails. Each builder returns { subject, text }.
const FOOTER = `\n\n${BRAND.notLawFirmNotice}`;

// Marketing emails carry a one-click unsubscribe link; every reminder links to message preferences
function formatLinks({ unsubscribeUrl = '', preferencesUrl = '' } = {}) {
  const lines = [];
  if (unsubscribeUrl) lines.push(`Stop these reminders: ${unsubscribeUrl}`);
  if (preferencesUrl) lines.push(`Message preferences: ${preferencesUrl}`);
  return lines.length > 0 ? `\n\n${lines.join('\n')}` : '';
}

function formatDaysLeft(daysLeft) {
  if (!(daysLeft > 0)) return '';
  return ` (in ${daysLeft} day${daysLeft === 1 ? '' : 's'})`;
}

export const EMAIL_COPY = Object.freeze({
  orderPaid: ({ fullName, orderReference, requestReference, itemTitles, totalText }) => ({
    subject: `Payment received for order ${orderReference}`,
    text: `Hello ${fullName},\n\nThank you. We've received your payment of ${totalText} for:\n${itemTitles.map((title) => `- ${title}`).join('\n')}\n\nOrder reference: ${orderReference}\nService request: ${requestReference}\n\nOur team will review your details and contact you about the next steps. You can follow progress by signing in to ${BRAND.dashboardName} with this email address.${FOOTER}`,
  }),

  orderRefunded: ({ fullName, orderReference, refundText, isFullRefund }) => ({
    subject: `Refund started for order ${orderReference}`,
    text: `Hello ${fullName},\n\nWe've started a ${isFullRefund ? 'full' : 'partial'} refund of ${refundText} for order ${orderReference}. Refunds usually reach your original payment method within 5–7 working days, depending on your bank.${FOOTER}`,
  }),

  documentReviewReady: ({ fullName, reviewReference, originalName }) => ({
    subject: `Your document review is ready (${reviewReference})`,
    text: `Hello ${fullName},\n\nThe review of "${originalName}" is ready. Sign in to ${BRAND.dashboardName} to read the report and, if you'd like, ask a lawyer to review it.${FOOTER}`,
  }),

  documentReviewFailed: ({ fullName, reviewReference, originalName }) => ({
    subject: `We couldn't review your document (${reviewReference})`,
    text: `Hello ${fullName},\n\nWe weren't able to prepare an automated review of "${originalName}". This doesn't count towards your daily reviews. You can try again, or ask our team for a lawyer review from ${BRAND.dashboardName}.${FOOTER}`,
  }),

  callbackRequested: ({ fullName, phone, callbackReference, preferredTimeLabel, languageLabel, serviceLabel, topic }) => ({
    subject: `Callback requested: ${fullName} (${callbackReference})`,
    text: `A visitor asked ${BRAND.name} to call them back.\n\nName: ${fullName}\nPhone: ${phone}\nWhen: ${preferredTimeLabel}\nLanguage: ${languageLabel}\nArea: ${serviceLabel}\nTopic: ${topic || '—'}\nReference: ${callbackReference}\n\nUpdate the status in the admin panel once you've called.`,
  }),

  orderStageChanged: ({ fullName, reference, stageLabel, note, url }) => ({
    subject: `Update on ${reference}: ${stageLabel}`,
    text: `Hello ${fullName},\n\nYour order ${reference} is now at: ${stageLabel}.${note ? `\n\nNote from our team: ${note}` : ''}\n\nSee the full timeline: ${url}${FOOTER}`,
  }),

  renewalReminder: ({ fullName, documentLabel, expiryText, daysLeft, renewUrl, unsubscribeUrl, preferencesUrl }) => ({
    subject: `Your ${documentLabel} ends on ${expiryText}`,
    text: `Hello ${fullName},\n\nYour ${documentLabel} ends on ${expiryText}${formatDaysLeft(daysLeft)}. Renew it in a few minutes:\n${renewUrl}\n\nAlready renewed? You can ignore this email.${formatLinks({ unsubscribeUrl, preferencesUrl })}${FOOTER}`,
  }),

  checkoutRecovery: ({ fullName, itemTitles, totalText, resumeUrl, unsubscribeUrl, preferencesUrl }) => ({
    subject: 'Your order is saved',
    text: `Hello ${fullName},\n\nYour order for ${itemTitles} (${totalText}) is saved. Finish it in about a minute:\n${resumeUrl}\n\nChanged your mind? No action needed.${formatLinks({ unsubscribeUrl, preferencesUrl })}${FOOTER}`,
  }),

  bookingRecovery: ({ fullName, resumeUrl, unsubscribeUrl, preferencesUrl }) => ({
    subject: 'Your consultation booking is saved',
    text: `Hello ${fullName},\n\nYou started booking a consultation but didn't finish. Pick a time in about a minute:\n${resumeUrl}\n\nChanged your mind? No action needed.${formatLinks({ unsubscribeUrl, preferencesUrl })}${FOOTER}`,
  }),

  deadlineReminder: ({ fullName, title, dueText, daysLeft, deadlinesUrl, preferencesUrl }) => ({
    subject: `Reminder: ${title} on ${dueText}`,
    text: `Hello ${fullName},\n\nA date you saved is coming up: ${title} on ${dueText}${formatDaysLeft(daysLeft)}.\n\nSee your dates: ${deadlinesUrl}${formatLinks({ preferencesUrl })}${FOOTER}`,
  }),

  consultationNotesReady: ({ fullName, consultationReference, notesUrl }) => ({
    subject: `Your consultation notes are ready (${consultationReference})`,
    text: `Hello ${fullName},\n\nThe key points and next steps from your consultation are ready:\n${notesUrl}\n\nWe've also added any dates to remember, and we'll remind you before they're due.${FOOTER}`,
  }),

  feedbackCsat: ({ fullName, serviceLabel, feedbackUrl }) => ({
    subject: 'How easy was it to get help?',
    text: `Hello ${fullName},\n\nOne quick question about your recent ${serviceLabel}: how easy was it to get help from ${BRAND.name}? It takes about 10 seconds:\n${feedbackUrl}\n\nThis is about our service, not the outcome of your matter.${FOOTER}`,
  }),

  feedbackNps: ({ fullName, feedbackUrl }) => ({
    subject: `Would you recommend ${BRAND.name}?`,
    text: `Hello ${fullName},\n\nHow likely are you to recommend ${BRAND.name} to a friend? One tap, one optional reason:\n${feedbackUrl}${FOOTER}`,
  }),

  referralRewardIssued: ({ fullName, rewardText, code, expiryText }) => ({
    subject: `You've earned ${rewardText} off your next service`,
    text: `Hello ${fullName},\n\nA friend used your referral code for their first order. Here's ${rewardText} off your next service:\n\nCode: ${code}\nValid until: ${expiryText}\n\nThe code works with this email address only.${FOOTER}`,
  }),
});
