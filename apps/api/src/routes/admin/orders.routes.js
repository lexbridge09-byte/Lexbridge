import { Router } from 'express';
import { z } from 'zod';
import { ORDER_STATUSES } from '@lexbridge/shared';
import { OrderModel } from '../../models/index.js';
import { refundOrder } from '../../services/index.js';
import { deriveContactSearchFilter, paginationSchema } from '../../utils.js';

const ADMIN_ORDER_LIST_FIELDS = 'ReferenceCode FullName Email Phone Items SubtotalPaise DiscountPaise TotalPaise CouponCode Status RefundedPaise ServiceRequestReference paidAt createdAt';

const listQuerySchema = paginationSchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

const refundSchema = z.object({
  // Omit for a full refund of the remaining amount
  AmountPaise: z.number().int('Use whole paise').min(1).optional(),
  Reason: z.string().trim().min(3, 'Add a reason for the refund').max(500),
});

export const adminOrdersRouter = Router();

adminOrdersRouter.get('/', async (req, res) => {
  const { page, limit, status, q } = listQuerySchema.parse(req.query);
  const filter = {};
  if (status) filter.Status = status;
  if (q) Object.assign(filter, deriveContactSearchFilter(q, { hasReferenceCode: true }));

  const [items, total] = await Promise.all([
    OrderModel.find(filter)
      .select(ADMIN_ORDER_LIST_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OrderModel.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

adminOrdersRouter.get('/:referenceCode', async (req, res) => {
  const order = await OrderModel.findOne({ ReferenceCode: req.params.referenceCode })
    .populate('Client', 'FullName Email Phone')
    .populate('ServiceRequest', 'ReferenceCode Status')
    .populate('Refunds.CreatedBy', 'FullName Email')
    .lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

adminOrdersRouter.post('/:referenceCode/refunds', async (req, res) => {
  const input = refundSchema.parse(req.body);
  const order = await refundOrder({
    referenceCode: req.params.referenceCode,
    amountPaise: input.AmountPaise,
    reason: input.Reason,
    adminId: req.user.id,
  });
  res.json({ order });
});
