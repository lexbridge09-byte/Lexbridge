'use client';

import { useState } from 'react';
import { useDictionary } from '@/brand/localeContext';
import { ADMIN_CONTROL_CLASS, ADMIN_LABEL_CLASS, ADMIN_TD_CLASS, ADMIN_TH_CLASS, AdminPageHeading, AdminTable } from '@/components/admin/adminStyles';
import { buildAdminQuery } from '@/components/admin/adminRequests';
import { ErrorNote, LoadingNote } from '@/components/loadState';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui';
import { useCatalogLabels, useFormatters } from '@/lib/localeTools';
import { useApiData } from '@/lib/useApiData';

const PAGE_LIMIT = 25;

export function AdminUsers() {
  const dictionary = useDictionary();
  const copy = dictionary.admin.users;
  const common = dictionary.admin.common;
  const labels = useCatalogLabels();
  const format = useFormatters();
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

      <form onSubmit={handleFilterSubmit} className="mb-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="user-role" className={ADMIN_LABEL_CLASS}>
            {copy.role}
          </label>
          <select id="user-role" name="role" defaultValue={filters.role} className={`mt-1 ${ADMIN_CONTROL_CLASS}`}>
            <option value="">{copy.allRoles}</option>
            <option value="client">{copy.clients}</option>
            <option value="admin">{copy.admins}</option>
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
            <tbody className="bg-white">
              {items.map((user) => (
                <tr key={user._id}>
                  <td className={ADMIN_TD_CLASS}>{user.FullName || common.notProvided}</td>
                  <td className={`${ADMIN_TD_CLASS} break-all`}>{user.Email}</td>
                  <td className={ADMIN_TD_CLASS}>{user.Phone || common.notProvided}</td>
                  <td className={ADMIN_TD_CLASS}>{labels.role(user.Role)}</td>
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
