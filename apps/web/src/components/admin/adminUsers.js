'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, ADMIN_TD_CLASS, ADMIN_TH_CLASS, AdminPageHeading, AdminTable } from '@/components/admin/adminStyles';
import { buildAdminQuery } from '@/components/admin/adminRequests';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui';
import { localizeApiError } from '@/lib/apiErrors';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useSession } from '@/lib/session';
import { useApiData } from '@/lib/useApiData';
import { requestApi } from '@/lib/apiClient';

const PAGE_LIMIT = 25;
const FILTER_ROLES = ['client', 'lawyer', 'manager', 'owner'];
const ASSIGNABLE_ROLES = ['client', 'lawyer', 'manager', 'owner'];

function RoleSelect({ user, canManage, isCurrentUser, labels, copy, onRoleChanged }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!canManage) return <span className="whitespace-nowrap">{labels.role(user.Role)}</span>;

  async function handleRoleChange(event) {
    const nextRole = event.target.value;
    if (nextRole === user.Role) return;
    setIsSaving(true);
    setError(null);
    try {
      const { user: updated } = await requestApi(`/admin/users/${user._id}/role`, {
        method: 'PATCH',
        body: { Role: nextRole },
      });
      onRoleChanged(updated);
    } catch (err) {
      setError(err);
      event.target.value = user.Role;
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <select
        aria-label={`${copy.changeRole}: ${user.Email}`}
        defaultValue={user.Role}
        onChange={handleRoleChange}
        disabled={isSaving || isCurrentUser}
        title={isCurrentUser ? copy.youLabel : undefined}
        className={`${ADMIN_CONTROL_CLASS} min-h-9 w-36 py-1.5`}
      >
        {ASSIGNABLE_ROLES.map((roleKey) => (
          <option key={roleKey} value={roleKey}>
            {labels.role(roleKey)}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{localizeApiError(error)}</p>}
    </div>
  );
}

export function AdminUsers() {
  const dictionary = useDictionary();
  const { user: viewer } = useSession();
  const copy = dictionary.admin.users;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
  const canManage = viewer?.Role === 'owner';
  const [filters, setFilters] = useState({ role: '', q: '' });
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useApiData(`/admin/users?${buildAdminQuery(filters, page, PAGE_LIMIT)}`);
  const items = data?.items ?? [];

  function handleFilterSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFilters({ role: String(formData.get('role') ?? ''), q: String(formData.get('q') ?? '').trim() });
    setPage(1);
  }

  return (
    <div>
      <AdminPageHeading title={copy.title} description={copy.description} />

      <form onSubmit={handleFilterSubmit} className="mb-4 grid gap-3 rounded-2xl border border-line bg-card p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
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
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.phone}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.role}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.joined}</th>
                <th scope="col" className={ADMIN_TH_CLASS}>{copy.columns.lastSignIn}</th>
              </tr>
            </thead>
            <tbody className="bg-card">
              {items.map((user) => (
                <tr key={user._id}>
                  <td className={ADMIN_TD_CLASS}>{user.FullName || common.notProvided}</td>
                  <td className={`${ADMIN_TD_CLASS} break-all`}>{user.Email}</td>
                  <td className={ADMIN_TD_CLASS}>{user.Phone || common.notProvided}</td>
                  <td className={ADMIN_TD_CLASS}>
                    <RoleSelect
                      user={user}
                      canManage={canManage}
                      isCurrentUser={viewer?.id === user._id}
                      labels={labels}
                      copy={copy}
                      onRoleChanged={() => reload()}
                    />
                  </td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{format.date(user.createdAt)}</td>
                  <td className={`${ADMIN_TD_CLASS} whitespace-nowrap`}>{user.lastLoginAt ? format.dateTime(user.lastLoginAt) : copy.never}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          <Pagination page={data.page ?? page} limit={data.limit ?? PAGE_LIMIT} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
