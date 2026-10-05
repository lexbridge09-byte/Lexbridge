import mongoose from 'mongoose';

// Team onboarding: the owner invites 2nd owners (managers); managers invite lawyers.
// The invite activates automatically the first time the invitee signs in with that
// email — the OTP proves they own the inbox, so no extra token is needed.
export const INVITE_ROLES = ['manager', 'lawyer'];
export const INVITE_STATUSES = ['pending', 'accepted', 'revoked'];

const INVITE_TTL_DAYS = 7;

const inviteSchema = new mongoose.Schema(
  {
    Email: { type: String, required: true, lowercase: true, trim: true },
    Role: { type: String, enum: INVITE_ROLES, required: true },
    InvitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    Status: { type: String, enum: INVITE_STATUSES, default: 'pending' },
    expiresAt: { type: Date, default: () => new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true, collection: 'invites' },
);

inviteSchema.index({ Email: 1, Status: 1 });
inviteSchema.index({ Status: 1, expiresAt: 1 });

export const InviteModel = mongoose.model('Invite', inviteSchema);
