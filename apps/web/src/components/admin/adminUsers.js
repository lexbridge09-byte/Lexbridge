'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import {
  ADMIN_CONTROL_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_TD_CLASS,
  ADMIN_TH_CLASS,
  AdminPageHeading,
  AdminPanel,
  AdminTable,
} from '@/components/admin/adminStyles';
import { buildAdminQuery } from '@/components/admin/adminRequests';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Pagination } from '@/components/pagination';
import { Badge, Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useSession } from '@/lib/session';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 25;
const FILTER_ROLES = ['client', 'lawyer', 'manager', 'owner'];

/*
  The main owner's people page. Promotion runs through email invites (main owner invites
  2nd owners); roles are read-only here. Team access removal also happens on this page via
  the invites API, which refuses while the person still has open assignments.
*/

function InviteForm({ copy, onDone }) {
  const dictionary = useDictionary();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    setIsSending(true);
    setMessage(null);
    try {
      await requestApi('/invites', { method: 'POST', body: { Email: value, Role: 'manager' } });
      setMessage({ tone: 'success', text: copy.inviteSent(value) });
      setEmail('');
      onDone();
    } catch (err) {
      setMessage({ tone: 'error', text: localizeApiError(err, dictionary) });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AdminPanel as="form" title={copy.inviteTitle} onSubmit={handleSubmit} className="mb-5">
      <p className="mb-3 text-sm leading-6 text-ink-muted">{copy.inviteIntro}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="owner-invite-email" className={ADMIN_LABEL_CLASS}>
            {copy.emailLabel}
          </label>
          <input
            id="owner-invite-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={copy.emailPlaceholder}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
        </div>
        <Button type="submit" size="sm" isLoading={isSending}>
          {copy.inviteAction}
        </Button>
      </div>
      {message && <div className="mt-3"><FormMessage message={message} /></div>}
    </AdminPanel>
  );
}

function InvitesPanel({ copy, data, onDone }) {
  const [rowBusy, setRowBusy] = useState('');
  const [message, setMessage] = useState(null);
  const pendingInvites = (data?.invites ?? []).filter((invite) => invite.Status === 'pending');

  async function inviteAction(inviteId, action) {
    setRowBusy(`${inviteId}:${action}`);
    setMessage(null);
    try {
      await requestApi(`/invites/${inviteId}/${action}`, { method: 'POST' });
      onDone();
    } catch (err) {
      setMessage({ tone: 'error', text: localizeApiError(err) });
    } finally {
      setRowBusy('');
    }
  }

  return (
    <AdminPanel title={copy.pendingTitle} className="mb-5">
      {pendingInvites.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.pendingEmpty}</p>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.emailColumn}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.roleColumn}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.expiresColumn}</th>
              <th scope="col" className={ADMIN_TH_CLASS}>{copy.actionsColumn}</th>
            </tr>
          </thead>
          <tbody className="bg-card">
            {pendingInvites.map((invite) => (
              <tr key={invite._id}>
                <td className={`${ADMIN_TD_CLASS} break-all`}>{invite.Email}</td>
                <td className={ADMIN_TD_CLASS}>{copy.roleNames[invite.Role] ?? invite.Role}</td>
                <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{invite.expiresAt?.slice(0, 10)}</td>
                <td className={ADMIN_TD_CLASS}>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={rowBusy !== ''} onClick={() => inviteAction(invite._id, 'resend')}>
                      {rowBusy === `${invite._id}:resend` ? copy.busy : copy.resend}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={rowBusy !== ''} onClick={() => inviteAction(invite._id, 'revoke')} className="text-danger">
                      {rowBusy === `${invite._id}:revoke` ? copy.busy : copy.revoke}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
      {message && <div className="mt-3"><FormMessage message={message} /></div>}
    </AdminPanel>
  );
}

export function AdminUsers() {
  const dictionary = useDictionary();
  const { user: viewer } = useSession();
  const copy = dictionary.admin.users;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const [filters, setFilters] = useState({ role: '', q: '' });
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(`/admin/users?${buildAdminQuery(filters, page, PAGE_LIMIT)}`);
  const { data: inviteData, error: inviteError, isLoading: inviteLoading, reload: reloadInvites } = useApiData('/invites');
  const items = data?.items ?? [];

  function handleFilterSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFilters({ role: String(formData.get('role') ?? ''), q: String(formData.get('q') ?? '').trim() });
    setPage(1);
  }

  async function removeAccess(userId) {
    try {
      await requestApi(`/invites/${userId}/remove-access`, { method: 'POST' });
    } catch {
      // A refused removal (open assignments) reloads the list either way
    }
    reload();
  }

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <InviteForm copy={copy} onDone={() => { reloadInvites(); reload(); }} />
      {!inviteLoading && !inviteError && <InvitesPanel copy={copy} data={inviteData} onDone={() => { reloadInvites(); reload(); }} />}

      <form onSubmit={handleFilterSubmit} className="mb-4 grid gap-3 rounded-card border border-line bg-card p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="user-role" className={ADMIN_LABEL_CLASS}>
            {copy.role}
          </label>
          <select id="user-role" name="role" defaultValue={filters.role} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
            <option value="">{copy.allRoles}</option>
            {FILTER_ROLES.map((roleKey) => (
              <option key={roleKey} value={roleKey}>
                {labels.role(roleKey)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="user-q" className={ADMIN_LABEL_CLASS}>
            {common.search}
          </label>
          <input
            id="user-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={copy.searchPlaceholder}
            title={copy.searchHint}
            className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
          />
        </div>
        <Button type="submit" size="sm">
          {common.apply}
        </Button>
      </form>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <p className="text-sm text-ink-muted">{copy.empty}</p>
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.name}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.email}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.role}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.joined}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.lastSignIn}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.actionsColumn}</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {items.map((user) => {
                const isTeamMember = user.Role === 'manager' || user.Role === 'lawyer';
                const isRemovable = isTeamMember && viewer?.Email?.toLowerCase() !== user.Email.toLowerCase();
                return (
                  <tr key={user._id}>
                    <td className={ADMIN_TD_CLASS}>{user.FullName || common.notProvided}</td>
                    <td className={`${ADMIN_TD_CLASS} break-all`}>{user.Email}</td>
                    <td className={ADMIN_TD_CLASS}>
                      <Badge tone={user.Role === 'owner' ? 'active' : user.Role === 'client' ? 'neutral' : 'attention'}>
                        {labels.role(user.Role)}
                      </Badge>
                    </td>
                    <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.date(user.createdAt)}</td>
                    <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{user.lastLoginAt ? format.dateTime(user.lastLoginAt) : copy.never}</td>
                    <td className={ADMIN_TD_CLASS}>
                      {isRemovable && (
                        <Button variant="ghost" size="sm" className="text-danger" onClick={() => removeAccess(user._id)}>
                          {user.Role === 'manager' ? copy.removeManager : copy.removeLawyer}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
