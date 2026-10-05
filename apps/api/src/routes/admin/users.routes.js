import { Router } from 'express';
import { z } from 'zod';
import { USER_ROLES, UserModel } from '../../models/index.js';
import { deriveContactSearchFilter, paginationSchema } from '../../utils.js';

const listQuerySchema = paginationSchema.extend({
  role: z.enum(USER_ROLES).optional(),
  q: z.string().trim().max(100).optional(),
});

const roleUpdateSchema = z.object({
  Role: z.enum(USER_ROLES),
});

export const adminUsersRouter = Router();

adminUsersRouter.get('/', async (req, res) => {
  const { page, limit, role, q } = listQuerySchema.parse(req.query);
  const filter = {};
  if (role) filter.Role = role;
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

// Owner-only: promote/demote team members. Sessions carry no role, so the change applies on the next request.
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

  const updated = await UserModel.findByIdAndUpdate(userId, { $set: { Role } }, { returnDocument: 'after' })
    .select('FullName Email Phone Role createdAt lastLoginAt')
    .lean();
  req.log.info({ actorId: req.user.id, targetId: userId, from: user.Role, to: Role }, '[users] role changed');
  res.json({ user: updated });
});
