'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, ADMIN_LINK_CLASS, AdminPageHeading, AdminPanel, AdminTable } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Button } from '@/components/ui';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

// The 2nd owner's lawyer onboarding: invite by email, manage pending invites,
// and remove team access (blocked while the lawyer still has open assignments).
export function LawyersPanel() {
  const dictionary = useDictionary();
  const copy = dictionary.team.lawyers;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/invites');
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState(null);
  const [rowBusy, setRowBusy] = useState('');

  const invites = data?.invites ?? [];
  const pendingInvites = invites.filter((invite) => invite.Status === 'pending');
  const lawyers = (data?.staff ?? []).filter((member) => member.Role === 'lawyer');

  async function handleInvite(event) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    setIsInviting(true);
    setMessage(null);
    try {
      await requestApi('/invites', { method: 'POST', body: { Email: value, Role: 'lawyer' } });
      setMessage({ tone: 'success', text: copy.inviteSent(value) });
      setEmail('');
      reload();
    } catch (err) {
      if (err.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(err, dictionary) });
    } finally {
      setIsInviting(false);
    }
  }

  async function inviteAction(inviteId, action) {
    setRowBusy(`${inviteId}:${action}`);
    setMessage(null);
    try {
      await requestApi(`/invites/${inviteId}/${action}`, { method: 'POST' });
      reload();
    } catch (err) {
      if (err.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(err, dictionary) });
    } finally {
      setRowBusy('');
    }
  }

  async function removeAccess(userId, userEmail) {
    setRowBusy(`remove:${userId}`);
    setMessage(null);
    try {
      await requestApi(`/invites/${userId}/remove-access`, { method: 'POST' });
      reload();
    } catch (err) {
      if (err.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(err, dictionary) });
    } finally {
      setRowBusy('');
    }
  }

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <AdminPanel as="form" title={copy.inviteTitle} onSubmit={handleInvite} className="mb-5">
        <p className="mb-3 text-sm leading-6 text-ink-muted">{copy.inviteIntro}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="lawyer-invite-email" className={ADMIN_LABEL_CLASS}>
              {copy.emailLabel}
            </label>
            <input
              id="lawyer-invite-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.emailPlaceholder}
              className={`mt-1 ${ADMIN_CONTROL_CLASS}`}
            />
          </div>
          <Button type="submit" size="sm" isLoading={isInviting}>
            {copy.inviteAction}
          </Button>
        </div>
        {message && <div className="mt-3"><FormMessage message={message} /></div>}
      </AdminPanel>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <div className="space-y-5">
          <AdminPanel title={copy.pendingTitle}>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.pendingEmpty}</p>
            ) : (
              <AdminTable>
                <thead>
                  <tr>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.emailColumn}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.expiresColumn}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.actionsColumn}</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {pendingInvites.map((invite) => (
                    <tr key={invite._id}>
                      <td className={`${ADMIN_TD_CLASS} break-all`}>{invite.Email}</td>
                      <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.date(invite.expiresAt)}</td>
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
          </AdminPanel>

          <AdminPanel title={copy.activeTitle}>
            {lawyers.length === 0 ? (
              <p className="text-sm text-ink-muted">{copy.activeEmpty}</p>
            ) : (
              <AdminTable>
                <thead>
                  <tr>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.nameColumn}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.emailColumn}</th>
                    <th scope="col" className={ADMIN_TH_CLASS}>{copy.actionsColumn}</th>
                  </tr>
                </thead>
                <tbody className="bg-card">
                  {lawyers.map((lawyer) => (
                    <tr key={lawyer._id}>
                      <td className={ADMIN_TD_CLASS}>{lawyer.FullName || copy.notProvided}</td>
                      <td className={`${ADMIN_TD_CLASS} break-all`}>{lawyer.Email}</td>
                      <td className={ADMIN_TD_CLASS}>
                        <Button variant="ghost" size="sm" disabled={rowBusy !== ''} onClick={() => removeAccess(lawyer._id, lawyer.Email)} className="text-danger">
                          {rowBusy === `remove:${lawyer._id}` ? copy.busy : copy.removeAccess}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminPanel>
        </div>
      )}
    </div>
  );
}
