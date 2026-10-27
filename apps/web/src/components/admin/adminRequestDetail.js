'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { REQUEST_STATUSES, getDisplayableIntakeDetails } from '@lexbridge/shared';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LINK_CLASS, AdminBackLink, AdminPanel } from '@/components/admin/adminStyles';
import { DocumentPreview } from '@/components/documentPreview';
import { SelectField } from '@/components/formFields';
import { InfoTip } from '@/components/infoTip';
import { DocumentUpload } from '@/components/documentUpload';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { IntakeDetailsPanel } from '@/components/intakeDetailsPanel';
import { ReferenceCodeTag } from '@/components/copyButton';
import { RequestStatusBadge } from '@/components/statusBadge';
import { StatusTimeline } from '@/components/statusTimeline';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { derivePersonLabel } from '@/lib/formatValues';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

function deriveClientWhatsAppHref(phone) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length < 10) return '';
  const withCountryCode = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountryCode}`;
}

function RequestUpdateForm({ request, team, basePath, onSaved, isBare = false }) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.requestDetail.update;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {};
    const status = String(formData.get('Status') ?? '');
    const note = String(formData.get('Note') ?? '').trim();
    const assignedTo = String(formData.get('AssignedTo') ?? '');
    const currentAssignedTo = request.AssignedTo?._id ?? request.AssignedTo ?? '';

    if (status && status !== request.Status) body.Status = status;
    if (note) body.Note = note;
    if (assignedTo !== String(currentAssignedTo)) body.AssignedTo = assignedTo || null;

    if (Object.keys(body).length === 0) {
      setMessage({ tone: 'error', text: copy.nothingChanged });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await requestApi(`${basePath}/${encodeURIComponent(request.ReferenceCode)}`, { method: 'PATCH', body });
      onSaved();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
      setIsSaving(false);
    }
  }

  const content = (
      <div className="space-y-3">
        <SelectField
          id="update-assigned"
          name="AssignedTo"
          label={copy.assignedTo}
          defaultValue={String(request.AssignedTo?._id ?? request.AssignedTo ?? '')}
          options={[
            { value: '', label: dictionary.admin.requests.unassigned },
            ...team.map((member) => ({
              value: String(member._id),
              label: `${derivePersonLabel(member)}${member.Role === 'lawyer' ? '' : ` (${labels.role(member.Role)})`}`,
            })),
          ]}
        />
        <SelectField
          id="update-status"
          name="Status"
          label={common.status}
          defaultValue={request.Status}
          options={REQUEST_STATUSES.map((status) => ({ value: status, label: labels.requestStatus(status) }))}
        />
        <div>
          <span className="flex items-center gap-1.5">
            <label htmlFor="update-note" className="block text-sm font-semibold text-ink">
              {copy.note}
            </label>
            <InfoTip>{copy.noteHint}</InfoTip>
          </span>
          <textarea
            id="update-note"
            name="Note"
            rows={isBare ? 3 : 2}
            maxLength={1000}
            className={`mt-1 resize-none ${ADMIN_CONTROL_CLASS}`}
          />

        </div>
        <FormMessage message={message} />
        <Button isLoading={isSaving} type="submit" size="sm" disabled={isSaving} className="w-full">
          {copy.save}
        </Button>
      </div>
  );

  if (isBare) return <form onSubmit={handleSubmit}>{content}</form>;
  return (
    <AdminPanel as="form" title={copy.title} onSubmit={handleSubmit}>
      {content}
    </AdminPanel>
  );
}

// dt/dd fragments inside a two-column dl grid: labels align down one column, values down the next
function DetailItem({ label, children }) {
  return (
    <>
      <dt className="text-xs font-semibold text-ink-muted sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{children}</dd>
    </>
  );
}

export function AdminRequestDetail({
  referenceCode,
  basePath = '/admin/service-requests',
  backHref = '/admin/requests',
  teamSourcePath = '/admin/users?role=staff&limit=100',
} = {}) {
  const dictionary = useDictionary();
  const copy = dictionary.admin.requestDetail;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const requestData = useApiData(`${basePath}/${encodeURIComponent(referenceCode)}`);
  const teamData = useApiData(teamSourcePath);
  const [savedMessage, setSavedMessage] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  if (requestData.isLoading && !requestData.data) return <LoadingNote />;
  if (requestData.error?.status === 404) {
    return (
      <div>
        <p className="text-on-canvas-muted">{copy.notFound(referenceCode)}</p>
        <div className="mt-3">
          <AdminBackLink href={backHref}>{copy.back}</AdminBackLink>
        </div>
      </div>
    );
  }
  if (requestData.error) return <ErrorNote error={requestData.error} onRetry={requestData.reload} />;

  const request = requestData.data?.request;
  if (!request) return null;
  const documents = requestData.data?.documents ?? [];
  const team = teamData.data?.items ?? [];
  const clientWhatsAppHref = request.WhatsAppOptIn ? deriveClientWhatsAppHref(request.Phone) : '';
  const serviceLabel = `${labels.service(request.ServiceCategory)}${request.Subtype ? `, ${dictionary.intake.subtypes[request.Subtype]?.label ?? request.Subtype}` : ''}`;

  function handleSaved() {
    setSavedMessage(copy.saved);
    requestData.reload();
  }

  const hasIntake = getDisplayableIntakeDetails(request.Subtype, request.IntakeDetails).length > 0;
  const centerTab = activeTab ?? (documents.length > 0 ? 'documents' : 'matter');
  const panelLabelClass = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted';

  /*
    Record workspace (Zendesk agent workspace / legal review tools): the page itself never scrolls on
    desktop. Centre = the work (document viewer at full height, or the matter); right = properties and
    actions, scrolling on their own. Phones stack everything in one natural scroll.
  */
  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-6.5rem)]">
      {/* Header strip */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <AdminBackLink href={backHref}>{copy.breadcrumb}</AdminBackLink>
        <h1 className="sr-only">{request.ReferenceCode}</h1>
        <ReferenceCodeTag code={request.ReferenceCode} />
        <RequestStatusBadge status={request.Status} />
        <p className="min-w-0 truncate text-sm text-on-canvas-muted">
          {copy.meta(serviceLabel, format.dateTime(request.createdAt), labels.requestSource(request.Source))}
        </p>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setActiveModal('upload')}>
          <Upload aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {copy.uploadCta}
        </Button>
      </div>

      {savedMessage && (
        <div className="shrink-0">
          <FormMessage message={{ tone: 'success', text: savedMessage }} />
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Centre: the work */}
        <section className="flex min-h-[70vh] flex-col rounded-card border border-line bg-card p-3 lg:min-h-0">
          <div role="tablist" className="mb-3 flex shrink-0 gap-1 border-b border-line">
            {[
              ['documents', `${copy.documents} (${documents.length})`],
              ['matter', copy.requirement],
            ].map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                role="tab"
                aria-selected={centerTab === tabKey}
                onClick={() => setActiveTab(tabKey)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors duration-(--dur-150) ${centerTab === tabKey ? 'border-primary text-ink' : 'border-transparent text-ink-muted hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">
            {centerTab === 'documents' ? (
              <DocumentPreview layout="viewer" documents={documents} copy={{ noDocuments: copy.noDocuments, download: dictionary.admin.requests.sheet.download }} />
            ) : (
              <div className="scroll-soft h-full space-y-5 overflow-y-auto pr-1">
                <p className="max-w-[75ch] whitespace-pre-line text-[15px] leading-7 text-ink">{request.Description}</p>
                {hasIntake && (
                  <div>
                    <h2 className={panelLabelClass}>{dictionary.intake.detailsTitle}</h2>
                    <div className="mt-2">
                      <IntakeDetailsPanel subtype={request.Subtype} details={request.IntakeDetails} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right: properties and actions (scrolls on its own) */}
        <aside className="scroll-soft min-h-0 space-y-3 overflow-y-auto lg:pr-1">
          <RequestUpdateForm key={request.updatedAt} request={request} team={team} basePath={basePath} onSaved={handleSaved} />

          <AdminPanel as="section" title={copy.clientTitle}>
            <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-2">
              <DetailItem label={copy.name}>{request.FullName}</DetailItem>
              <DetailItem label={copy.email}>
                <a href={`mailto:${request.Email}`} className={`break-all ${ADMIN_LINK_CLASS}`}>
                  {request.Email}
                </a>
              </DetailItem>
              <DetailItem label={copy.phone}>
                <a href={`tel:${request.Phone.replace(/[^\d+]/g, '')}`} className={ADMIN_LINK_CLASS}>
                  {request.Phone}
                </a>
              </DetailItem>
              <DetailItem label={copy.whatsApp}>
                {request.WhatsAppOptIn ? copy.optedIn : copy.notOptedIn}
                {clientWhatsAppHref && (
                  <a
                    href={`${clientWhatsAppHref}?text=${encodeURIComponent(copy.chatGreeting(request.FullName, request.ReferenceCode))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`ml-2 ${ADMIN_LINK_CLASS}`}
                  >
                    {copy.openChat}
                  </a>
                )}
              </DetailItem>
              <DetailItem label={copy.consent}>{request.ConsentGiven ? format.dateTime(request.consentedAt) : copy.no}</DetailItem>
              <DetailItem label={copy.account}>{request.Client ? copy.linkedAccount : copy.guest}</DetailItem>
            </dl>
          </AdminPanel>

          <AdminPanel as="section" title={copy.history}>
            <StatusTimeline entries={request.StatusHistory} />
          </AdminPanel>
        </aside>
      </div>

        {activeModal === 'upload' && (
          <Modal title={dictionary.forms.upload.title} onClose={() => setActiveModal(null)}>
            <DocumentUpload
              requestReference={request.ReferenceCode}
              isBare
              kinds={[
                { value: 'document', endpoint: '/admin/documents', label: copy.kindDocument, description: copy.kindDocumentHint },
                { value: 'deliverable', endpoint: `/team/requests/${encodeURIComponent(request.ReferenceCode)}/deliverable`, label: copy.kindDeliverable, description: copy.kindDeliverableHint },
              ]}
              onUploaded={() => {
                requestData.reload();
                setActiveModal(null);
              }}
            />
          </Modal>
        )}
    </div>
  );
}
