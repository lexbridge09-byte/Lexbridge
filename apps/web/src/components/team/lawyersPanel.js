'use client';

import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, AdminPageHeading, AdminPanel, AdminTable, ADMIN_TD_CLASS, ADMIN_TH_CLASS } from '@/components/admin/adminStyles';
import { ErrorNote, FormMessage, LoadingNote } from '@/components/loadState';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/modal';
import { requestApi } from '@/lib/apiClient';
import { localizeApiError } from '@/lib/apiErrors';
import { useFormatters } from '@/lib/localeTools';
import { redirectToLogin, useApiData } from '@/lib/useApiData';

// The 2nd owner's lawyer onboarding: invite by email (popup), manage pending invites,
// and remove team access (blocked while the lawyer still has open assignments).
export function LawyersPanel() {
  const dictionary = useDictionary();
  const copy = dictionary.team.lawyers;
  const format = useFormatters();
  const { data, error, isLoading, reload } = useApiData('/invites');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [message, setMessage] = useState(null);

  const invites = data?.invites ?? [];
  const pendingInvites = invites.filter((invite) => invite.Status === 'pending');
  const lawyers = (data?.staff ?? []).filter((member) => member.Role === 'lawyer');

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

  async function removeAccess(userId) {
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

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => setIsInviteOpen(true)}>
          <UserPlus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {copy.inviteAction}
        </Button>
        <FormMessage message={message} />
      </div>

      {isLoading && !data ? (
        <LoadingNote />
      ) : error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <div className="space-y-4">
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
                        <Button variant="ghost" size="sm" disabled={rowBusy !== ''} onClick={() => removeAccess(lawyer._id)} className="text-danger">
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

      {isInviteOpen && (
        <InviteModal
          copy={copy}
          onClose={() => setIsInviteOpen(false)}
          onInvited={(sentMessage) => {
            setIsInviteOpen(false);
            setMessage({ tone: 'success', text: sentMessage });
            reload();
          }}
        />
      )}
    </div>
  );
}

function InviteModal({ copy, onClose, onInvited }) {
  const dictionary = useDictionary();
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleInvite(event) {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    setIsInviting(true);
    setMessage(null);
    try {
      await requestApi('/invites', { method: 'POST', body: { Email: value, Role: 'lawyer' } });
      onInvited(copy.inviteSent(value));
    } catch (err) {
      if (err.status === 401) {
        redirectToLogin();
        return;
      }
      setMessage({ tone: 'error', text: localizeApiError(err, dictionary) });
      setIsInviting(false);
    }
  }

  return (
    <Modal title={copy.inviteTitle} onClose={onClose}>
      <form onSubmit={handleInvite} className="space-y-3">
        <p className="text-sm leading-6 text-ink-muted">{copy.inviteIntro}</p>
        <div>
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
        {message && <FormMessage message={message} />}
        <Button type="submit" size="sm" isLoading={isInviting} className="w-full">
          {copy.inviteAction}
        </Button>
      </form>
    </Modal>
  );
}
