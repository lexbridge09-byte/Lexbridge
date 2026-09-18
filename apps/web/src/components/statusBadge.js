'use client';

import { Badge } from '@/components/ui';
import { useCatalogLabels } from '@/lib/localeTools';

const REQUEST_TONES = {
  submitted: 'active',
  'under-review': 'active',
  'in-progress': 'active',
  'awaiting-client': 'attention',
  completed: 'done',
  closed: 'neutral',
};

const CONSULTATION_TONES = {
  scheduled: 'active',
  completed: 'done',
  cancelled: 'neutral',
  'no-show': 'attention',
};

const SLOT_TONES = { open: 'done', booked: 'active', blocked: 'neutral' };

const ORDER_TONES = {
  created: 'attention',
  paid: 'done',
  failed: 'danger',
  refunded: 'neutral',
  'partially-refunded': 'attention',
  cancelled: 'neutral',
};

const DOCUMENT_REVIEW_TONES = { queued: 'active', processing: 'active', completed: 'done', failed: 'danger' };

const RISK_TONES = { low: 'done', moderate: 'attention', high: 'danger' };

const CALLBACK_TONES = { new: 'active', called: 'done', 'no-answer': 'attention', closed: 'neutral' };

export function RequestStatusBadge({ status }) {
  return <Badge tone={REQUEST_TONES[status]}>{useCatalogLabels().requestStatus(status)}</Badge>;
}

export function ConsultationStatusBadge({ status }) {
  return <Badge tone={CONSULTATION_TONES[status]}>{useCatalogLabels().consultationStatus(status)}</Badge>;
}

export function SlotStatusBadge({ status }) {
  return <Badge tone={SLOT_TONES[status]}>{useCatalogLabels().slotStatus(status)}</Badge>;
}

export function ArticleStatusBadge({ status }) {
  return <Badge tone={status === 'published' ? 'done' : 'neutral'}>{useCatalogLabels().articleStatus(status)}</Badge>;
}

export function OrderStatusBadge({ status }) {
  return <Badge tone={ORDER_TONES[status]}>{useCatalogLabels().orderStatus(status)}</Badge>;
}

export function DocumentReviewStatusBadge({ status }) {
  return <Badge tone={DOCUMENT_REVIEW_TONES[status]}>{useCatalogLabels().documentReviewStatus(status)}</Badge>;
}

export function RiskBadge({ level }) {
  const labels = useCatalogLabels();
  if (!level) return null;
  return <Badge tone={RISK_TONES[level]}>{labels.riskLevel(level)}</Badge>;
}

export function CallbackStatusBadge({ status }) {
  return <Badge tone={CALLBACK_TONES[status]}>{useCatalogLabels().callbackStatus(status)}</Badge>;
}
