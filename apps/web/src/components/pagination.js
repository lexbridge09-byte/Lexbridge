'use client';

import { useDictionary } from '@/brand/localeContext';
import { Button } from '@/components/ui';

export function Pagination({ page, limit, total, onPageChange }) {
  const copy = useDictionary().common.pagination;
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / (limit || 1)));
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={copy.label} className="mt-5 flex items-center gap-4">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        {copy.previous}
      </Button>
      <span className="text-sm text-ink-muted">{copy.pageOf(page, pageCount)}</span>
      <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        {copy.next}
      </Button>
    </nav>
  );
}
