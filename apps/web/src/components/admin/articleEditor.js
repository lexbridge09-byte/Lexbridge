'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ARTICLE_STATUSES, ARTICLE_TOPIC_KEYS } from '@lexbridge/shared';
import { useDictionary, useLocalizedHref } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, AdminPanel } from '@/components/admin/adminStyles';
import { FieldError } from '@/components/formFields';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { LocaleLink } from '@/components/localeLink';
import { MarkdownContent } from '@/components/markdownContent';
import { ArticleStatusBadge } from '@/components/statusBadge';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError, localizeFieldErrors } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

function ArticleForm({ article }) {
  const router = useRouter();
  const toLocalized = useLocalizedHref();
  const dictionary = useDictionary();
  const copy = dictionary.admin.articleEditor;
  const labels = useCatalogLabels();
  const isNew = !article;
  const [body, setBody] = useState(article?.Body ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      Title: String(formData.get('Title') ?? '').trim(),
      Summary: String(formData.get('Summary') ?? '').trim(),
      Topic: String(formData.get('Topic') ?? ''),
      Status: String(formData.get('Status') ?? 'draft'),
      Body: body,
    };
    const slug = String(formData.get('Slug') ?? '').trim();
    if (slug) payload.Slug = slug;

    setIsSaving(true);
    setFieldErrors({});
    setMessage(null);
    try {
      if (isNew) {
        const data = await requestApi('/admin/articles', { method: 'POST', body: payload });
        router.replace(toLocalized(`/admin/articles/${data.article._id}`));
        return;
      }
      await requestApi(`/admin/articles/${article._id}`, { method: 'PATCH', body: payload });
      setMessage({ tone: 'success', text: payload.Status === 'published' ? copy.savedPublished : copy.savedDraft });
      router.refresh();
    } catch (error) {
      if (error.status === 401) {
        redirectToLogin();
        return;
      }
      setFieldErrors(localizeFieldErrors(error, dictionary));
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsSaving(true);
    try {
      await requestApi(`/admin/articles/${article._id}`, { method: 'DELETE' });
      router.replace(toLocalized('/admin/articles'));
    } catch (error) {
      setMessage({ tone: 'error', text: localizeApiError(error, dictionary) });
      setIsSaving(false);
      setIsConfirmingDelete(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AdminPanel>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="article-title" className={ADMIN_LABEL_CLASS}>
              {copy.title}
            </label>
            <input
              id="article-title"
              name="Title"
              required
              defaultValue={article?.Title ?? ''}
              placeholder={copy.titlePlaceholder}
              className={`mt-1 font-display text-lg ${ADMIN_CONTROL_CLASS}`}
            />
            <FieldError id="article-title-error" message={fieldErrors.Title} />
          </div>
          <div>
            <label htmlFor="article-slug" className={ADMIN_LABEL_CLASS}>
              {copy.slug}
            </label>
            <input
              id="article-slug"
              name="Slug"
              defaultValue={article?.Slug ?? ''}
              placeholder={copy.slugPlaceholder}
              aria-describedby="article-slug-hint"
              className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
            />
            <p id="article-slug-hint" className="mt-1 text-xs text-ink-muted">
              {copy.slugHint}
            </p>
            <FieldError id="article-slug-error" message={fieldErrors.Slug} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="article-topic" className={ADMIN_LABEL_CLASS}>
                {copy.topic}
              </label>
              <select id="article-topic" name="Topic" required defaultValue={article?.Topic ?? ''} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
                <option value="">{copy.topicPlaceholder}</option>
                {ARTICLE_TOPIC_KEYS.map((topicKey) => (
                  <option key={topicKey} value={topicKey}>
                    {labels.articleTopic(topicKey)}
                  </option>
                ))}
              </select>
              <FieldError id="article-topic-error" message={fieldErrors.Topic} />
            </div>
            <div>
              <label htmlFor="article-status" className={ADMIN_LABEL_CLASS}>
                {copy.status}
              </label>
              <select id="article-status" name="Status" defaultValue={article?.Status ?? 'draft'} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
                {ARTICLE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {labels.articleStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="article-summary" className={ADMIN_LABEL_CLASS}>
              {copy.summary}
            </label>
            <textarea
              id="article-summary"
              name="Summary"
              rows={2}
              maxLength={300}
              defaultValue={article?.Summary ?? ''}
              placeholder={copy.summaryPlaceholder}
              className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
            />
            <FieldError id="article-summary-error" message={fieldErrors.Summary} />
          </div>
        </div>
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel>
          <label htmlFor="article-body" className={ADMIN_LABEL_CLASS}>
            {copy.body}
          </label>
          <textarea
            id="article-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={22}
            aria-describedby="article-body-hint"
            className={`mt-1 font-mono text-[0.85rem] leading-relaxed ${ADMIN_CONTROL_CLASS}`}
          />
          <p id="article-body-hint" className="mt-1 text-xs text-ink-muted">
            {copy.bodyHint}
          </p>
          <FieldError id="article-body-error" message={fieldErrors.Body} />
        </AdminPanel>
        <AdminPanel>
          <p className={ADMIN_LABEL_CLASS}>{copy.preview}</p>
          <div className="mt-1 min-h-[12rem]" aria-live="off">
            {body.trim() ? <MarkdownContent source={body} /> : <p className="text-sm text-ink-muted">{copy.previewEmpty}</p>}
          </div>
        </AdminPanel>
      </div>

      <FormMessage message={message} />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? dictionary.admin.common.saving : isNew ? copy.create : copy.save}
        </Button>
        <LocaleLink href="/admin/articles" className="text-sm font-semibold text-ink-muted hover:underline">
          {copy.back}
        </LocaleLink>
        {!isNew && article.Status === 'published' && (
          <LocaleLink href={`/insights/${article.Slug}`} target="_blank" className="text-sm font-semibold text-primary hover:underline">
            {copy.viewOnSite}
          </LocaleLink>
        )}
        {!isNew && !isConfirmingDelete && (
          <button type="button" onClick={() => setIsConfirmingDelete(true)} className="ml-auto text-sm font-semibold text-danger hover:underline">
            {copy.delete}
          </button>
        )}
        {!isNew && isConfirmingDelete && (
          <span role="group" aria-label={copy.confirmLabel} className="ml-auto flex flex-wrap items-center gap-3 text-sm">
            <span>{copy.confirmBody}</span>
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={isSaving}>
              {copy.confirmYes}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsConfirmingDelete(false)}>
              {copy.confirmNo}
            </Button>
          </span>
        )}
      </div>
    </form>
  );
}

export function ArticleEditor({ articleId }) {
  const copy = useDictionary().admin.articleEditor;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData(articleId ? `/admin/articles/${encodeURIComponent(articleId)}` : null);

  if (!articleId) {
    return (
      <div>
        <h1 className="mb-4 text-h3 text-ink">{copy.newTitle}</h1>
        <ArticleForm />
      </div>
    );
  }

  if (isLoading && !data) return <LoadingNote />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;
  const article = data?.article;
  if (!article) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-h3 text-ink">{copy.editTitle}</h1>
        <ArticleStatusBadge status={article.Status} />
        <span className="text-xs text-ink-muted">{copy.lastSaved(format.dateTime(article.updatedAt))}</span>
      </div>
      <ArticleForm key={article.updatedAt} article={article} />
    </div>
  );
}
