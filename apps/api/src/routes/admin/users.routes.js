import { Router } from 'express';
import { z } from 'zod';
import { USER_ROLES, UserModel } from '../../models/index.js';
import { deriveContactSearchFilter, paginationSchema } from '../../utils.js';

const listQuerySchema = paginationSchema.extend({
  role: z.enum(USER_ROLES).optional(),
  q: z.string().trim().max(100).optional(),
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
