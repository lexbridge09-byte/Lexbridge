import { BRAND } from '../brand/index.js';

// Brand colours as solid values (no images, so nothing disappears in dark mode)
const COLOURS = Object.freeze({
  canvas: '#12141b',
  card: '#ffffff',
  ink: '#1a1d26',
  muted: '#5c6270',
  line: '#e4e6ec',
  rose: '#c88f6c',
  roseDark: '#8a5338',
  soft: '#f8ece4',
});

const URL_LINE = /^https?:\/\/\S+$/;
// Short labels only (1–3 words), so ordinary sentences containing a colon stay sentences
const LABEL_LINE = /^([A-Z][\w’'/-]*(?: [\w’'/-]+){0,2}):\s+(\S.{0,80})$/;
const LABELLED_URL_LINE = /^(.+?):\s*(https?:\/\/\S+)$/;
const OTP_LINE = /\b(\d{6})\b/;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

// Inline links inside a sentence ("See the full timeline: https://…")
function linkify(escapedText) {
  return escapedText.replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${COLOURS.roseDark};font-weight:600;word-break:break-all;">$1</a>`);
}

function renderButton(url) {
  const safeUrl = escapeHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td style="border-radius:10px;background:${COLOURS.rose};"><a href="${safeUrl}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:${COLOURS.canvas};text-decoration:none;">Open &rarr;</a></td></tr></table>`;
}

/*
  Turns a plain-text email into its HTML version, block by block:
  a lone link → button; "Label: value" lines → a details table; "- item" lines → a list;
  a sign-in code → a large code box; everything else → paragraphs. The wording stays in emailCopy.
*/
function renderBody(text, { isCodeEmail }) {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.length === 1 && URL_LINE.test(lines[0])) return renderButton(lines[0]);
      // "See the full timeline: https://…" → the sentence, then a button
      if (lines.length === 1 && LABELLED_URL_LINE.test(lines[0])) {
        const [, label, url] = lines[0].match(LABELLED_URL_LINE);
        return `<p style="margin:0 0 4px;font-size:15px;line-height:24px;color:${COLOURS.ink};">${escapeHtml(label)}</p>${renderButton(url)}`;
      }
      if (lines.length > 1 && lines.every((line) => LABEL_LINE.test(line) && !/[.?!]$/.test(line))) {
        const rows = lines
          .map((line) => {
            const [, label, value] = line.match(LABEL_LINE);
            return `<tr><td style="padding:6px 12px 6px 0;color:${COLOURS.muted};font-size:13px;white-space:nowrap;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:6px 0;color:${COLOURS.ink};font-size:14px;font-weight:600;">${linkify(escapeHtml(value))}</td></tr>`;
          })
          .join('');
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:4px 0 16px;border-top:1px solid ${COLOURS.line};border-bottom:1px solid ${COLOURS.line};">${rows}</table>`;
      }
      const listLines = lines.filter((line) => line.startsWith('- '));
      if (listLines.length > 0 && listLines.length === lines.length - 1 && !lines[0].startsWith('- ')) {
        return `<p style="margin:0 0 6px;font-size:15px;line-height:24px;color:${COLOURS.ink};">${linkify(escapeHtml(lines[0]))}</p><ul style="margin:0 0 16px;padding-left:20px;color:${COLOURS.ink};font-size:15px;line-height:24px;">${listLines.map((line) => `<li>${linkify(escapeHtml(line.slice(2)))}</li>`).join('')}</ul>`;
      }
      const codeMatch = isCodeEmail ? block.match(OTP_LINE) : null;
      if (codeMatch) {
        const sentence = escapeHtml(block.replace(/\s*(?:is\s*)?\d{6}\.?/, ':'));
        return `<p style="margin:0 0 10px;font-size:15px;line-height:24px;color:${COLOURS.ink};">${sentence}</p><div style="margin:0 0 18px;padding:14px 0;border-radius:12px;background:${COLOURS.soft};text-align:center;font-family:Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:${COLOURS.roseDark};">${codeMatch[1]}</div>`;
      }
      return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${COLOURS.ink};">${lines.map((line) => linkify(escapeHtml(line))).join('<br>')}</p>`;
    })
    .join('');
}

function deriveContactLine() {
  return [BRAND.supportPhone && `Call ${BRAND.supportPhone}`, BRAND.supportEmail && `email ${BRAND.supportEmail}`].filter(Boolean).join(' or ');
}

// Plain-text version (always sent too, for deliverability): body + contact details
export function renderEmailText(text) {
  const contactLine = deriveContactLine();
  const body = text.replace(`\n\n${BRAND.notLawFirmNotice}`, '');
  return `${body}\n\n—\nQuestions? ${contactLine}.\n${BRAND.notLawFirmNotice}`;
}

/*
  Branded HTML email (≈600px, single column, key message first, 15px text, contact details in the footer).
  Table layout and inline styles for email-client support; solid colours so dark mode can't hide anything.
*/
export function renderEmailHtml({ subject, text }) {
  const isCodeEmail = /sign-in code|verification code|OTP/i.test(subject);
  const body = renderBody(text.replace(`\n\n${BRAND.notLawFirmNotice}`, ''), { isCodeEmail });
  const phoneHref = BRAND.supportPhone ? `tel:${BRAND.supportPhone.replace(/[^\d+]/g, '')}` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOURS.canvas};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(subject)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOURS.canvas};">
  <tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
      <tr><td style="padding:0 4px 18px;">
        <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:${COLOURS.rose};letter-spacing:0.3px;">${escapeHtml(BRAND.name)}</span>
        <span style="display:block;margin-top:2px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:13px;color:#e7b596;">${escapeHtml(BRAND.tagline)}</span>
      </td></tr>
      <tr><td style="background:${COLOURS.card};border-radius:16px;padding:28px 28px 12px;border-top:4px solid ${COLOURS.rose};">
        <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:28px;color:${COLOURS.ink};">${escapeHtml(subject)}</h1>
        ${body}
        <p style="margin:8px 0 16px;font-size:14px;color:${COLOURS.muted};">${escapeHtml(BRAND.emailSignOff)}</p>
      </td></tr>
      <tr><td style="padding:20px 8px 0;text-align:center;">
        <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#c9cdd6;">
          Questions? ${phoneHref ? `<a href="${phoneHref}" style="color:#e7b596;font-weight:600;text-decoration:none;">${escapeHtml(BRAND.supportPhone)}</a>` : ''}${phoneHref && BRAND.supportEmail ? ' &middot; ' : ''}${BRAND.supportEmail ? `<a href="mailto:${escapeHtml(BRAND.supportEmail)}" style="color:#e7b596;font-weight:600;text-decoration:none;">${escapeHtml(BRAND.supportEmail)}</a>` : ''}
        </p>
        <p style="margin:0;font-size:11px;line-height:17px;color:#7e8594;">${escapeHtml(BRAND.notLawFirmNotice)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
