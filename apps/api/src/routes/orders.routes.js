import { Router } from 'express';
import { requireAuth } from '../middleware/index.js';
import { OrderModel } from '../models/index.js';
import { CLIENT_ORDER_FIELDS } from '../services/index.js';

const MAX_CLIENT_ORDERS = 200;

// Email is verified by OTP at sign-in, so orders placed before signing in are included
function deriveOwnerFilter(user) {
  return { $or: [{ Client: user.id }, { Email: user.email }] };
}

export const ordersRouter = Router();

ordersRouter.get('/mine', requireAuth, async (req, res) => {
  const orders = await OrderModel.find(deriveOwnerFilter(req.user))
    .select(CLIENT_ORDER_FIELDS)
    .sort({ createdAt: -1 })
    .limit(MAX_CLIENT_ORDERS)
    .lean();
  res.json({ orders });
});

ordersRouter.get('/mine/:referenceCode', requireAuth, async (req, res) => {
  const order = await OrderModel.findOne({ ReferenceCode: req.params.referenceCode, ...deriveOwnerFilter(req.user) })
    .select(CLIENT_ORDER_FIELDS)
    .lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});
