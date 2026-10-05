import { Router } from 'express';
import { z } from 'zod';
import { InviteModel, ServiceRequestModel, STAFF_ROLES, USER_ROLES, UserModel } from '../../models/index.js';
import { deriveContactSearchFilter, paginationSchema } from '../../utils.js';

const listQuerySchema = paginationSchema.extend({
  // 'staff' matches every team role at once (lawyer, manager, owner)
  role: z.enum([...USER_ROLES, 'staff']).optional(),
  q: z.string().trim().max(100).optional(),
});

const roleUpdateSchema = z.object({
  Role: z.enum(USER_ROLES),
});

export const adminUsersRouter = Router();

adminUsersRouter.get('/', async (req, res) => {
  const { page, limit, role, q } = listQuerySchema.parse(req.query);
  const filter = {};
  if (role === 'staff') filter.Role = { $in: STAFF_ROLES };
  else if (role) filter.Role = role;
  if (q) Object.assign(filter, deriveContactSearchFilter(q));

  const [items, total] = await Promise.all([
    UserModel.find(filter)
      .select('FullName Email Phone Role createdAt lastLoginAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    UserModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

// Owner-only role management. Promotion happens through email invites (main owner invites
// 2nd owners, 2nd owners invite lawyers — role activates at first sign-in), so this endpoint
// is for demotions and corrections. Guarded: never leave the platform ownerless, never
// strand open assignments.
adminUsersRouter.patch('/:userId/role', async (req, res) => {
  const { Role } = roleUpdateSchema.parse(req.body ?? {});
  const userId = req.params.userId;
  if (!/^[a-f\d]{24}$/i.test(userId)) return res.status(404).json({ error: 'User not found' });

  const user = await UserModel.findById(userId).select('FullName Email Role').lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.Role === Role) return res.json({ user });

  // Never leave the platform without an owner
  if (user.Role === 'owner' && Role !== 'owner') {
    const ownerCount = await UserModel.countDocuments({ Role: 'owner', _id: { $ne: userId } });
    if (ownerCount === 0) {
      return res.status(400).json({ error: 'Promote another owner before changing this one — there must always be at least one owner.' });
    }
  }

  // Demotions must not strand open work
  if (user.Role !== 'client' && Role === 'client') {
    const openCount = await ServiceRequestModel.countDocuments({
      AssignedTo: userId,
      Status: { $in: ['assigned', 'in-progress', 'awaiting-client'] },
    });
    if (openCount > 0) {
      return res.status(400).json({
        error: `${user.Email} still has ${openCount} open assignment${openCount === 1 ? '' : 's'}. Reassign that work before removing their team access.`,
      });
    }
  }

  const updated = await UserModel.findByIdAndUpdate(userId, { $set: { Role } }, { returnDocument: 'after' })
    .select('FullName Email Phone Role createdAt lastLoginAt')
    .lean();
  // Any pending invite for this email is moot once the role is set directly
  if (Role === 'client') {
    await InviteModel.updateMany({ Email: user.Email, Status: 'pending' }, { $set: { Status: 'revoked' } });
  }
  req.log.info({ actorId: req.user.id, targetId: userId, from: user.Role, to: Role }, '[users] role changed');
  res.json({ user: updated });
});
