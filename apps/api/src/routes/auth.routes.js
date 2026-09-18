import crypto from 'node:crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { ADMIN_EMAILS, IS_PRODUCTION, JWT_SECRET, SESSION_COOKIE_NAME } from '../config/index.js';
import { createRateLimiter, requireAuth } from '../middleware/index.js';
import { OtpModel, UserModel } from '../models/index.js';
import { enqueueNotifications, sendMail } from '../services/index.js';
import { extractPublicUser } from '../utils.js';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_EMAIL_MAX_ATTEMPTS = 3;
const SESSION_DAYS = 7;

const requestOtpLimiter = createRateLimiter({
  name: 'auth-request-otp',
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: 'Too many code requests. Please try again in a few minutes.',
});

const verifyOtpLimiter = createRateLimiter({
  name: 'auth-verify-otp',
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: 'Too many attempts. Please try again in a few minutes.',
});

const requestOtpSchema = z.object({
  Email: z.email().max(254),
});

const verifyOtpSchema = z.object({
  Email: z.email().max(254),
  Code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

const updateProfileSchema = z.object({
  FullName: z.string().trim().min(2).max(120).optional(),
  Phone: z.string().trim().regex(/^\+?[\d\s-]{8,18}$/, 'Enter a valid phone number').optional(),
});

function hashOtp(email, code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ email: user.Email }, JWT_SECRET, {
    subject: String(user._id),
    expiresIn: `${SESSION_DAYS}d`,
  });
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export const authRouter = Router();

authRouter.post('/request-otp', requestOtpLimiter, async (req, res) => {
  const email = requestOtpSchema.parse(req.body).Email.toLowerCase();
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  await OtpModel.deleteMany({ Email: email });
  await OtpModel.create({
    Email: email,
    CodeHash: hashOtp(email, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  const message = {
    to: email,
    subject: 'Your LexBridge sign-in code',
    text: `Your LexBridge sign-in code is ${code}.\n\nIt expires in ${OTP_TTL_MINUTES} minutes. If you did not request this code, you can ignore this email.`,
  };
  // Sent inline so the code arrives quickly; if the mail server is struggling, the outbox retries it
  try {
    await sendMail(message);
  } catch (err) {
    req.log.warn({ error: err.message }, '[auth] sign-in email failed, queued for retry');
    await enqueueNotifications('sign-in-code', [
      { channel: 'email', payload: message, maxAttempts: OTP_EMAIL_MAX_ATTEMPTS },
    ]);
  }

  res.json({ ok: true });
});

authRouter.post('/verify-otp', verifyOtpLimiter, async (req, res) => {
  const { Email, Code } = verifyOtpSchema.parse(req.body);
  const email = Email.toLowerCase();

  const otp = await OtpModel.findOne({ Email: email, expiresAt: { $gt: new Date() } });
  if (!otp || otp.Attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(400).json({ error: 'This code is invalid or has expired. Request a new one.' });
  }

  const isMatch = crypto.timingSafeEqual(
    Buffer.from(otp.CodeHash, 'hex'),
    Buffer.from(hashOtp(email, Code), 'hex'),
  );
  if (!isMatch) {
    await OtpModel.updateOne({ _id: otp._id }, { $inc: { Attempts: 1 } });
    return res.status(400).json({ error: 'This code is invalid or has expired. Request a new one.' });
  }

  // Only one concurrent verification can consume the code
  const consumed = await OtpModel.deleteOne({ _id: otp._id });
  if (consumed.deletedCount === 0) {
    return res.status(400).json({ error: 'This code is invalid or has expired. Request a new one.' });
  }

  const update = { lastLoginAt: new Date() };
  if (ADMIN_EMAILS.has(email)) update.Role = 'admin';

  const user = await UserModel.findOneAndUpdate(
    { Email: email },
    { $set: update },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  );

  setSessionCookie(res, user);
  res.json({ user: extractPublicUser(user) });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user.id).select('FullName Email Phone Role').lean();
  if (!user) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return res.status(401).json({ error: 'Please sign in to continue' });
  }
  res.json({ user: extractPublicUser(user) });
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const updates = updateProfileSchema.parse(req.body);
  const user = await UserModel.findByIdAndUpdate(req.user.id, { $set: updates }, { returnDocument: 'after' }).lean();
  if (!user) return res.status(404).json({ error: 'Account not found' });
  res.json({ user: extractPublicUser(user) });
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});
