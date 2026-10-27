'use client';

import { Download, FileImage, FileText } from 'lucide-react';
import { useState } from 'react';
import { useFormatters } from '@/lib/localeTools';

const PREVIEW_TYPES = /^(application\/pdf|image\/(png|jpe?g|webp|gif))$/;

function deriveDocumentHref(documentId, isInline) {
  return `/api/documents/${documentId}/download${isInline ? '?inline=1' : ''}`;
}

/*
  Document list with an inline preview pane: PDFs and images open right here (no download needed);
  other types offer a download. Access rules are the API's: owners, managers and the assigned lawyer.
*/
export function DocumentPreview({ documents, copy, layout = 'stacked' }) {
  const isSplit = layout === 'split';
  const format = useFormatters();
  const firstPreviewable = documents.find((document) => PREVIEW_TYPES.test(document.MimeType ?? ''));
  const [activeId, setActiveId] = useState(firstPreviewable?._id ?? documents[0]?._id ?? null);
  const active = documents.find((document) => document._id === activeId);
  const isActivePreviewable = active && PREVIEW_TYPES.test(active.MimeType ?? '');

  if (documents.length === 0) return <p className="text-sm text-ink-muted">{copy.noDocuments}</p>;

  // Viewer mode (record workspaces): a slim file bar above a viewer that fills the remaining height
  if (layout === 'viewer') {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        {documents.length > 1 && (
          <div role="tablist" className="scroll-row flex shrink-0 gap-1.5 overflow-x-auto">
            {documents.map((document) => {
              const isActive = document._id === activeId;
              return (
                <button
                  key={document._id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(document._id)}
                  className={`flex max-w-56 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-(--dur-150) ${isActive ? 'border-primary bg-primary-50 text-primary-dark' : 'border-line text-ink-muted hover:border-line-strong hover:text-ink'}`}
                >
                  <FileText aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
                  <span className="truncate">{document.OriginalName}</span>
                </button>
              );
            })}
          </div>
        )}
        {active && (
          <div className="flex shrink-0 items-center gap-2 text-xs text-ink-muted">
            <span className="truncate font-semibold text-ink">{active.OriginalName}</span>
            <span>· {format.fileSize(active.SizeBytes ?? 0)}</span>
            <a href={deriveDocumentHref(active._id, false)} className="ml-auto inline-flex items-center gap-1 font-semibold text-primary-dark hover:underline">
              <Download aria-hidden="true" className="size-3.5" strokeWidth={2} />
              {copy.download}
            </a>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-hidden rounded-card border border-line bg-card-dim">
          {isActivePreviewable ? (
            active.MimeType === 'application/pdf' ? (
              <iframe key={active._id} title={active.OriginalName} src={`${deriveDocumentHref(active._id, true)}#navpanes=0&view=FitH`} className="h-full min-h-[24rem] w-full bg-white" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file streamed by the API
              <img key={active._id} src={deriveDocumentHref(active._id, true)} alt={active.OriginalName} className="h-full w-full object-contain" />
            )
          ) : (
            <div className="flex h-full min-h-[16rem] items-center justify-center p-6 text-center text-sm text-ink-muted">
              <a href={active ? deriveDocumentHref(active._id, false) : '#'} className="inline-flex items-center gap-1.5 font-semibold text-primary-dark hover:underline">
                <Download aria-hidden="true" className="size-4" strokeWidth={2} />
                {copy.download}
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={isSplit ? 'grid gap-3 md:grid-cols-[15rem_minmax(0,1fr)]' : 'space-y-3'}>
      <ul className="space-y-1.5">
        {documents.map((document) => {
          const isPreviewable = PREVIEW_TYPES.test(document.MimeType ?? '');
          const isActive = document._id === activeId;
          const Icon = document.MimeType?.startsWith('image/') ? FileImage : FileText;
          return (
            <li key={document._id} className={`flex items-center gap-3 rounded-control border px-3 py-2 transition-colors duration-(--dur-150) ${isActive ? 'border-primary bg-primary-50' : 'border-line hover:border-line-strong'}`}>
              <button
                type="button"
                disabled={!isPreviewable}
                onClick={() => setActiveId(document._id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 text-primary-dark" strokeWidth={1.75} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{document.OriginalName}</span>
                  <span className="block text-xs text-ink-muted">
                    {format.fileSize(document.SizeBytes ?? 0)}
                    {document.createdAt ? ` · ${format.dateTime(document.createdAt)}` : ''}
                  </span>
                </span>
              </button>
              <a
                href={deriveDocumentHref(document._id, false)}
                aria-label={`${copy.download}: ${document.OriginalName}`}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--dur-150) hover:bg-card-dim hover:text-ink"
              >
                <Download aria-hidden="true" className="size-4" strokeWidth={2} />
              </a>
            </li>
          );
        })}
      </ul>

      {isActivePreviewable && (
        <div className="overflow-hidden rounded-card border border-line bg-card-dim">
          {active.MimeType === 'application/pdf' ? (
            <iframe key={active._id} title={active.OriginalName} src={`${deriveDocumentHref(active._id, true)}#navpanes=0&view=FitH`} className={`w-full bg-white ${isSplit ? 'h-[75vh]' : 'h-[60vh]'}`} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated file streamed by the API
            <img key={active._id} src={deriveDocumentHref(active._id, true)} alt={active.OriginalName} className="max-h-[60vh] w-full object-contain" />
          )}
        </div>
      )}
    </div>
  );
}
