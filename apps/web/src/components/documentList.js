'use client';

import { Download, FileText } from 'lucide-react';
import { useDictionary } from '@/brand/localeContext';
import { useFormatters } from '@/lib/localeTools';

export function DocumentList({ documents, emptyText, showReference = false }) {
  const copy = useDictionary().forms.documentList;
  const format = useFormatters();

  if (!documents?.length) {
    return <p className="py-2 text-ink-muted">{emptyText ?? copy.empty}</p>;
  }

  return (
    <ul className="divide-y divide-line">
      {documents.map((document) => (
        <li key={document._id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
            <FileText aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <a href={`/api/documents/${document._id}/download`} className="break-all font-semibold text-ink hover:text-primary hover:underline">
              {document.OriginalName}
            </a>
            <p className="text-xs text-ink-muted">
              {[
                copy.typeLabels[document.MimeType] ?? copy.fallbackType,
                format.fileSize(document.SizeBytes),
                copy.uploadedOn(format.date(document.createdAt)),
                document.UploadedByRole === 'admin' ? copy.sharedByTeam : null,
                showReference && document.RequestReference ? copy.forReference(document.RequestReference) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <a
            href={`/api/documents/${document._id}/download`}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-alt hover:text-primary"
          >
            <Download aria-hidden="true" className="size-5" strokeWidth={1.75} />
            <span className="sr-only">
              {copy.download}: {document.OriginalName}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
