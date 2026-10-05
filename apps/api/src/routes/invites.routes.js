import { Router } from 'express';
import { z } from 'zod';
import { requireOwner } from '../middleware/index.js';
import { createRateLimiter, requireAuth } from '../middleware/index.js';
import { INVITE_ROLES, InviteModel, ServiceRequestModel, STAFF_ROLES, UserModel } from '../models/index.js';
import { sendInviteEmail } from '../services/index.js';
import { createHttpError } from '../utils.js';

/*
  Team onboarding cascade: the owner invites 2nd owners (managers), managers invite lawyers.
  Nobody invites an owner. Invites activate when the invitee signs in with that email (the
  OTP proves inbox ownership) — see auth.routes.js verify-otp.
*/

const inviteLimiter = createRateLimiter({
  name: 'invites-create',
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: 'Too many invites sent. Please try again later.',
});

const createInviteSchema = z.object({
  Email: z.email().max(254),
  Role: z.enum(INVITE_ROLES),
});

const EMAIL_PROJECTION = 'Email FullName Role createdAt';

function isInvitingAllowed(viewerRole, inviteRole) {
  if (viewerRole === 'owner') return inviteRole === 'manager';
  if (viewerRole === 'manager') return inviteRole === 'lawyer';
  return false;
}

export const invitesRouter = Router();

invitesRouter.use(requireAuth);

// requireAuth carries only id+email; the role matrix needs the DB role, fresh on every call
async function loadViewer(req) {
  const viewer = await UserModel.findById(req.user.id).select('Role Email').lean();
  if (!viewer || !['owner', 'manager'].includes(viewer.Role)) {
    throw createHttpError(403, 'Only the main owner and 2nd owners manage the team.');
  }
  return viewer;
}

invitesRouter.post('/', inviteLimiter, async (req, res) => {
  const input = createInviteSchema.parse(req.body ?? {});
  const email = input.Email.toLowerCase();
  const viewer = await loadViewer(req);

  if (!isInvitingAllowed(viewer.Role, input.Role)) {
    throw createHttpError(403, 'You can only invite lawyers. 2nd owners are invited by the main owner.');
  }

  const existingUser = await UserModel.findOne({ Email: email }).select('Role').lean();
  if (existingUser && STAFF_ROLES.includes(existingUser.Role)) {
    throw createHttpError(400, `${email} already has team access as ${existingUser.Role}.`);
  }

  const pending = await InviteModel.findOne({ Email: email, Status: 'pending', expiresAt: { $gt: new Date() } });
  if (pending) {
    return res.status(400).json({ error: `An invitation for ${email} is already pending.` });
  }

  const invite = await InviteModel.create({ Email: email, Role: input.Role, InvitedBy: req.user.id });
  const inviter = await UserModel.findById(req.user.id).select('FullName Email').lean();
  try {
    await sendInviteEmail(invite, inviter);
  } catch (err) {
    // The invite row stands; the inviter can resend from the panel
    req.log.warn({ error: err.message }, '[invites] invite email failed');
    throw createHttpError(503, 'The invitation was saved but the email could not be sent. Use Resend in a moment.');
  }

  res.status(201).json({ invite: invite.toObject() });
});

invitesRouter.get('/', async (req, res) => {
  const viewer = await loadViewer(req);
  // Owner sees the whole cascade; a manager sees only their lawyer tier
  const inviteFilter = viewer.Role === 'owner' ? {} : { Role: 'lawyer' };
  const [invites, staff] = await Promise.all([
    InviteModel.find(inviteFilter).populate('InvitedBy', 'FullName Email').sort({ createdAt: -1 }).limit(200).lean(),
    UserModel.find({ Role: { $in: viewer.Role === 'owner' ? ['manager', 'lawyer'] : ['lawyer'] } })
      .select(EMAIL_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ]);
  res.json({ invites, staff });
});

async function loadMutableInvite(req) {
  const viewer = await loadViewer(req);
  const invite = await InviteModel.findById(req.params.id);
  if (!invite) throw createHttpError(404, 'Invitation not found');
  if (!isInvitingAllowed(viewer.Role, invite.Role)) {
    throw createHttpError(403, 'Only the inviting tier can manage this invitation.');
  }
  return invite;
}

invitesRouter.post('/:id/revoke', async (req, res) => {
  const invite = await loadMutableInvite(req);
  if (invite.Status !== 'pending') throw createHttpError(400, 'Only pending invitations can be revoked.');
  invite.Status = 'revoked';
  await invite.save();
  res.json({ invite: invite.toObject() });
});

invitesRouter.post('/:id/resend', async (req, res) => {
  const invite = await loadMutableInvite(req);
  if (invite.Status !== 'pending') throw createHttpError(400, 'Only pending invitations can be resent.');
  invite.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await invite.save();
  const inviter = await UserModel.findById(req.user.id).select('FullName Email').lean();
  await sendInviteEmail(invite, inviter);
  res.json({ invite: invite.toObject() });
});

// Remove team access: manager demotes lawyers, owner demotes managers (and lawyers).
// Blocked while the person still has open work — reassign first.
invitesRouter.post('/:userId/remove-access', async (req, res) => {
  const viewer = await loadViewer(req);
  const target = await UserModel.findById(req.params.userId).select('Email Role').lean();
  if (!target) throw createHttpError(404, 'Account not found');
  if (!['manager', 'lawyer'].includes(target.Role)) {
    throw createHttpError(400, 'Only team accounts (2nd owner / lawyer) can lose team access here.');
  }
  if (target.Role === 'manager' && viewer.Role !== 'owner') {
    throw createHttpError(403, 'Only the main owner can remove a 2nd owner.');
  }
  if (target.Email.toLowerCase() === viewer.Email.toLowerCase()) {
    throw createHttpError(400, 'You cannot remove your own team access.');
  }

  const openCount = await ServiceRequestModel.countDocuments({
    AssignedTo: target._id,
    Status: { $in: ['assigned', 'in-progress', 'awaiting-client'] },
  });
  if (openCount > 0) {
    throw createHttpError(400, `${target.Email} still has ${openCount} open assignment${openCount === 1 ? '' : 's'}. Reassign that work first.`);
  }

  const updated = await UserModel.findByIdAndUpdate(target._id, { $set: { Role: 'client' } }, { returnDocument: 'after' })
    .select(EMAIL_PROJECTION)
    .lean();
  await InviteModel.updateMany({ Email: target.Email, Status: 'pending' }, { $set: { Status: 'revoked' } });
  req.log.info({ actorId: req.user.id, targetId: String(target._id), role: target.Role }, '[invites] team access removed');
  res.json({ user: updated });
});
